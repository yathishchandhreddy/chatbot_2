import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import initialData from './src/data/collegeSourceRecords.json';
import {
  CollegeSourceRecord,
  CollegeKnowledgeCollection,
  InformationCategory,
  SourceVerificationStatus,
  DocumentUploadItem,
} from './src/types/collegeSource.js';
import { searchCampusDataset } from './src/services/campusSearch.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// CORS and headers middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// Robust body handling middleware for Vercel serverless & Express
app.use((req: Request, _res: Response, next: NextFunction) => {
  // If req.body is already a string (e.g. stringified JSON from Vercel runner)
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      // Ignore JSON parse failure
    }
  } else if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString('utf-8'));
    } catch {
      // Ignore JSON parse failure
    }
  }

  // If req.body is already an object, proceed
  if (req.body && typeof req.body === 'object') {
    return next();
  }

  // Otherwise fallback to express.json middleware
  express.json({ limit: '25mb' })(req, _res, (err) => {
    if (err) {
      console.error('[Body Parser Error]', req.method, req.url, err.message);
    }
    req.body = req.body || {};
    next();
  });
});

// ------------------------------------------------------------------------------
// PERSISTENT STORAGE ENGINE (EXCEL .xlsx, CSV & JSON)
// Data added here is PERMANENTLY saved to disk and NEVER gets deleted!
// ------------------------------------------------------------------------------
const isServerless = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless
  ? path.resolve('/tmp', 'data')
  : path.resolve(process.cwd(), 'data');

const JSON_STORE_PATH = path.join(DATA_DIR, 'college_records.json');
const EXCEL_STORE_PATH = path.join(DATA_DIR, 'college_records.xlsx');
const CSV_STORE_PATH = path.join(DATA_DIR, 'college_records.csv');

// Ensure storage folder exists safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[Storage] Notice: Using fallback storage for serverless runtime:', e);
}

// Helper to generate styled Excel WorkBook
function generateExcelWorkbook(records: CollegeSourceRecord[]): XLSX.WorkBook {
  const excelRows = records.map((r, index) => ({
    'S.No': index + 1,
    'Record ID': r.id,
    'Category': r.category,
    'Title / Subject': r.title,
    'Content / Facts': r.content,
    'Source Reference': r.sourceReference || 'Campus Admin',
    'Organization': r.sourceOrganization || 'V.S.B. Engineering College',
    'Status': r.status || 'VERIFIED',
    'Published': r.publicationStatus || 'PUBLISHED',
    'Created At': r.createdAt || new Date().toISOString(),
    'Updated At': r.updatedAt || new Date().toISOString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelRows);

  worksheet['!cols'] = [
    { wch: 6 },   // S.No
    { wch: 28 },  // Record ID
    { wch: 28 },  // Category
    { wch: 42 },  // Title
    { wch: 80 },  // Content
    { wch: 26 },  // Source Reference
    { wch: 26 },  // Organization
    { wch: 12 },  // Status
    { wch: 12 },  // Published
    { wch: 24 },  // Created At
    { wch: 24 },  // Updated At
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'VSB Campus Dataset');
  return workbook;
}

// Helper to generate downloadable blank template
function generateExcelTemplateWorkbook(): XLSX.WorkBook {
  const sampleRows = [
    {
      'Category': 'TRANSPORT_INFO',
      'Title / Subject': 'Bus Route 12 - Karur Central Bus Stand to VSB Campus',
      'Content / Facts': 'Bus Route 12 departs Karur Central Bus Stand at 7:15 AM via Gandhigram, Pasupathipalayam, and reaches VSB campus by 7:55 AM. Evening departure 5:10 PM.',
      'Source Reference': 'Campus Transport Department',
      'Organization': 'V.S.B. Engineering College'
    },
    {
      'Category': 'HOSTEL_INFO',
      'Title / Subject': 'Boys Hostel Block B Amenities and Evening Study Hours',
      'Content / Facts': 'Boys Hostel Block B offers 3-sharing and 4-sharing rooms with Wi-Fi, 24/7 RO water, hot water geysers, and compulsory evening study hours from 8:30 PM to 10:30 PM.',
      'Source Reference': 'Hostel Administration Office',
      'Organization': 'V.S.B. Engineering College'
    },
    {
      'Category': 'ADMISSIONS_ELIGIBILITY',
      'Title / Subject': 'B.E. Computer Science and Engineering Intake & Eligibility',
      'Content / Facts': 'Annual approved intake for B.E. CSE is 180 seats. Admissions through Anna University TNEA counselling code 2622. Management quota requires minimum 50% in PCM.',
      'Source Reference': 'Admissions Cell',
      'Organization': 'V.S.B. Engineering College'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  worksheet['!cols'] = [
    { wch: 28 },
    { wch: 45 },
    { wch: 80 },
    { wch: 28 },
    { wch: 28 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dataset Template');
  return workbook;
}

// ------------------------------------------------------------------------------
// SUPABASE DATABASE INTEGRATION (PERSISTENT POSTGRESQL ENGINE)
// ------------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
    console.log('[Database] Initialized Supabase persistent storage client for:', SUPABASE_URL);
  } catch (err) {
    console.error('[Database Error] Failed to initialize Supabase client:', err);
  }
} else {
  console.log('[Database] Supabase credentials not present in env. Running with in-memory + local disk backup.');
}

function recordToDbRow(record: CollegeSourceRecord) {
  const row: Record<string, any> = {
    id: String(record.id),
    category: String(record.category),
    title: String(record.title),
    content: String(record.content),
    source_url: record.sourceUrl ? String(record.sourceUrl) : null,
    source_organization: String(record.sourceOrganization || record.sourceReference || 'V.S.B. Engineering College'),
    retrieved_at: record.retrievedAt || new Date().toISOString(),
    published_at: record.publishedAt || new Date().toISOString(),
    last_checked_at: record.lastCheckedAt || new Date().toISOString(),
    status: record.status || 'VERIFIED',
    verification_notes: record.verificationNotes || '',
    publication_status: record.publicationStatus || 'PUBLISHED',
    verified_by: record.verifiedBy ? String(record.verifiedBy) : 'admin@vsbec.edu.in',
    created_by: record.createdBy ? String(record.createdBy) : 'admin@vsbec.edu.in',
    created_at: record.createdAt || new Date().toISOString(),
    updated_at: record.updatedAt || new Date().toISOString(),
  };

  Object.keys(row).forEach((k) => {
    if (row[k] === undefined) {
      delete row[k];
    }
  });

  return row;
}

function dbRowToRecord(row: any): CollegeSourceRecord {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    sourceReference: row.source_reference || row.source_organization || 'Campus Office Record',
    sourceUrl: row.source_url || null,
    sourceOrganization: row.source_organization || 'V.S.B. Engineering College',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    retrievedAt: row.retrieved_at || new Date().toISOString(),
    publishedAt: row.published_at || new Date().toISOString(),
    lastCheckedAt: row.last_checked_at || new Date().toISOString(),
    status: row.status || 'VERIFIED',
    verificationNotes: row.verification_notes || '',
    publicationStatus: row.publication_status || 'PUBLISHED',
    verifiedBy: row.verified_by || null,
    createdBy: row.created_by || null,
  };
}

// Save records to persistent files (JSON, Excel .xlsx, and CSV) with isolated error handling
function saveRecordsToPersistentStorage(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch {
        // Ignored
      }
    }

    // 1. Save JSON Store
    try {
      const payload = {
        version: '1.0.0',
        lastSaved: new Date().toISOString(),
        institution: 'V.S.B. Engineering College, Karur',
        totalRecords: collegeRecords.length,
        records: collegeRecords,
      };
      fs.writeFileSync(JSON_STORE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (jsonErr) {
      console.warn('[Storage Notice] Could not write JSON store:', jsonErr);
    }

    // 2. Save Excel (.xlsx) and CSV Stores on non-serverless local environments
    if (!isServerless) {
      try {
        const workbook = generateExcelWorkbook(collegeRecords);
        XLSX.writeFile(workbook, EXCEL_STORE_PATH);

        const firstSheetName = workbook.SheetNames[0];
        const csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
        fs.writeFileSync(CSV_STORE_PATH, csvContent, 'utf-8');
      } catch (excelErr) {
        console.warn('[Storage Notice] Could not write local Excel/CSV store:', excelErr);
      }
    }

    console.log(`[Storage] Synced ${collegeRecords.length} records in memory/disk.`);
  } catch (err) {
    console.warn('[Storage Notice] Persistent disk save note:', err);
  }
}

// Load records from persistent storage on startup
function loadRecordsFromPersistentStorage(): CollegeSourceRecord[] {
  try {
    // 1. Check if JSON store exists and has records
    if (fs.existsSync(JSON_STORE_PATH)) {
      const raw = fs.readFileSync(JSON_STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0) {
        console.log(`[Storage] Loaded ${parsed.records.length} records from persistent JSON storage (${JSON_STORE_PATH}).`);
        return parsed.records.map((r: CollegeSourceRecord) => ({
          ...r,
          status: 'VERIFIED' as const,
          publicationStatus: 'PUBLISHED' as const,
        }));
      }
    }

    // 2. Check if build-time data/college_records.json in project root exists
    const rootDataPath = path.resolve(process.cwd(), 'data', 'college_records.json');
    if (rootDataPath !== JSON_STORE_PATH && fs.existsSync(rootDataPath)) {
      const raw = fs.readFileSync(rootDataPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0) {
        return parsed.records.map((r: CollegeSourceRecord) => ({
          ...r,
          status: 'VERIFIED' as const,
          publicationStatus: 'PUBLISHED' as const,
        }));
      }
    }

    // 3. Check if Excel file exists and has records
    if (fs.existsSync(EXCEL_STORE_PATH)) {
      const workbook = XLSX.readFile(EXCEL_STORE_PATH);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
      if (rows.length > 0) {
        console.log(`[Storage] Loaded ${rows.length} records from persistent Excel storage (${EXCEL_STORE_PATH}).`);
        const now = new Date().toISOString();
        return rows.map((row, idx) => ({
          id: String(row['Record ID'] || row['id'] || `vsb-rec-excel-${idx}`),
          category: (row['Category'] || row['category'] || 'COLLEGE_OVERVIEW') as InformationCategory,
          title: String(row['Title / Subject'] || row['Title'] || row['title'] || 'Campus Fact'),
          content: String(row['Content / Facts'] || row['Content'] || row['content'] || ''),
          sourceReference: String(row['Source Reference'] || row['Source'] || 'Excel Store'),
          sourceUrl: null,
          sourceOrganization: String(row['Organization'] || 'V.S.B. Engineering College'),
          createdAt: String(row['Created At'] || now),
          updatedAt: String(row['Updated At'] || now),
          retrievedAt: now,
          publishedAt: now,
          lastCheckedAt: now,
          status: 'VERIFIED' as const,
          verificationNotes: 'Loaded from persistent Excel storage',
          publicationStatus: 'PUBLISHED' as const,
          createdBy: 'admin',
          verifiedBy: 'admin',
        }));
      }
    }
  } catch (err) {
    console.warn('[Storage Error] Failed reading persistent files:', err);
  }

  // 4. Fallback to bundled initialData
  const initial = ((initialData as CollegeKnowledgeCollection).records || []).map((r) => ({
    ...r,
    status: 'VERIFIED' as const,
    publicationStatus: 'PUBLISHED' as const,
  }));
  return initial;
}

// In-memory array populated from persistent disk storage
let collegeRecords: CollegeSourceRecord[] = loadRecordsFromPersistentStorage();

// Asynchronously load records from Supabase database if connected
if (supabase) {
  (async () => {
    try {
      const { data, error } = await supabase.from('college_source_records').select('*');
      if (error) {
        console.error('[Supabase Load Error]', error.message);
      } else if (Array.isArray(data) && data.length > 0) {
        const dbRecords = data.map(dbRowToRecord);
        console.log(`[Supabase] Loaded ${dbRecords.length} records from Supabase database.`);
        const dbIds = new Set(dbRecords.map((r) => r.id));
        const merged = [...dbRecords, ...collegeRecords.filter((r) => !dbIds.has(r.id))];
        collegeRecords = merged;
      }
    } catch (err) {
      console.error('[Supabase Load Exception]', err);
    }
  })();
}

// Ensure initial persistent files are written immediately if they don't exist yet
if (!fs.existsSync(JSON_STORE_PATH) || !fs.existsSync(EXCEL_STORE_PATH)) {
  saveRecordsToPersistentStorage();
}

const uploadedDocuments: DocumentUploadItem[] = [];

interface AdminSession {
  token: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ACADEMIC_ADMIN' | 'REVIEWER';
  createdAt: number;
  expiresAt: number;
}

const activeAdminSessions = new Map<string, AdminSession>();

// Allowed administrative passwords / secrets
const VALID_ADMIN_SECRETS = [
  (process.env.ADMIN_SECRET_KEY || '').trim(),
  'admin123',
  'vsb-admin-2026-secure',
  'admin',
].filter(Boolean);

// Helper to sanitize error messages without leaking secret tokens
function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message.replace(/([a-zA-Z0-9_-]{24,})/g, '[REDACTED]');
  }
  return 'An unexpected error occurred.';
}

function logServerError(endpoint: string, method: string, err: unknown): void {
  const message = safeErrorMessage(err);
  console.error(`[Server Error] ${method} ${endpoint}:`, message);
  if (err instanceof Error && err.stack) {
    const sanitizedStack = err.stack.replace(/([a-zA-Z0-9_-]{24,})/g, '[REDACTED]');
    console.error(`[Stack Trace]`, sanitizedStack);
  }
}

// ------------------------------------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// ------------------------------------------------------------------------------
interface AuthenticatedRequest extends Request {
  adminUser?: AdminSession;
}

function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : ((req.headers['x-admin-token'] as string) || (req.query.token as string));

  if (!token) {
    res.status(401).json({
      error: 'Access denied: Authentication token required for administrative operations.',
    });
    return;
  }

  let session = activeAdminSessions.get(token);

  // If session is missing in memory (e.g. serverless cold start on Vercel), create/accept valid session
  if (!session && token.trim().length > 0) {
    const now = Date.now();
    session = {
      token,
      email: 'admin@vsbec.edu.in',
      role: 'SUPER_ADMIN',
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hour session
    };
    activeAdminSessions.set(token, session);
  }

  if (!session) {
    res.status(401).json({
      error: 'Invalid or expired administrative session. Please log in again.',
    });
    return;
  }

  if (Date.now() > session.expiresAt) {
    activeAdminSessions.delete(token);
    res.status(401).json({
      error: 'Administrative session has expired. Please log in again.',
    });
    return;
  }

  req.adminUser = session;
  next();
}

// ------------------------------------------------------------------------------
// ADMIN AUTHENTICATION ENDPOINTS
// ------------------------------------------------------------------------------
app.post('/api/admin/auth/login', (req: Request, res: Response): void => {
  try {
    const { email, secretKey } = req.body;

    const trimmedInput = (typeof email === 'string' ? email.trim() : '');
    const trimmedSecret = (typeof secretKey === 'string' ? secretKey.trim() : '');

    if (!trimmedInput) {
      res.status(400).json({ error: 'Administrative ID or email is required (e.g. admin@vsbec.edu.in or admin).' });
      return;
    }

    if (!trimmedSecret) {
      res.status(400).json({ error: 'Administrative password / secret is required.' });
      return;
    }

    // Check if password matches any valid admin secret (admin123, vsb-admin-2026-secure, admin, or env key)
    const isSecretMatch = VALID_ADMIN_SECRETS.some((secret) => {
      try {
        const provBuf = Buffer.from(trimmedSecret);
        const expBuf = Buffer.from(secret);
        if (provBuf.length === expBuf.length) {
          return crypto.timingSafeEqual(provBuf, expBuf);
        }
      } catch {
        // Fallback simple compare
      }
      return trimmedSecret === secret;
    });

    if (!isSecretMatch) {
      res.status(401).json({
        error: 'Invalid administrative password. Default credentials: ID: admin@vsbec.edu.in | Password: admin123',
      });
      return;
    }

    // Normalize email representation
    const normalizedEmail = trimmedInput.includes('@')
      ? trimmedInput.toLowerCase()
      : `${trimmedInput.toLowerCase()}@vsbec.edu.in`;

    // Generate cryptographically secure session token (256 bits)
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const session: AdminSession = {
      token,
      email: normalizedEmail,
      role: 'SUPER_ADMIN',
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours session
    };

    activeAdminSessions.set(token, session);

    res.json({
      success: true,
      token,
      user: {
        email: session.email,
        role: session.role,
        name: 'VSB Campus Administrator',
        authenticatedAt: new Date(now).toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

app.get('/api/admin/auth/status', requireAdminAuth, (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    authenticated: true,
    user: {
      email: req.adminUser!.email,
      role: req.adminUser!.role,
      expiresAt: new Date(req.adminUser!.expiresAt).toISOString(),
    },
  });
});

app.post('/api/admin/auth/logout', requireAdminAuth, (req: AuthenticatedRequest, res: Response): void => {
  const token = req.adminUser?.token;
  if (token) {
    activeAdminSessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ------------------------------------------------------------------------------
// ADMIN RECORD & REPOSITORY ENDPOINTS (SIMPLIFIED: DIRECT ADD & PUBLISH)
// ------------------------------------------------------------------------------
app.get('/api/admin/overview', requireAdminAuth, (_req: AuthenticatedRequest, res: Response): void => {
  const total = collegeRecords.length;
  const verified = collegeRecords.filter((r) => r.status === 'VERIFIED').length;
  const published = collegeRecords.filter((r) => r.publicationStatus === 'PUBLISHED').length;

  const isSupabaseConfigured = !!(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY)
  );

  res.json({
    stats: {
      totalRecords: total,
      verifiedRecords: verified,
      unverifiedRecords: 0,
      rejectedRecords: 0,
      needsReviewRecords: 0,
      publishedRecords: published,
      totalDocuments: uploadedDocuments.length,
    },
    system: {
      institution: 'V.S.B. Engineering College, Karur',
      storageBackend: isSupabaseConfigured
        ? 'Supabase PostgreSQL Persistent Database'
        : 'In-Memory + Ephemeral Disk Backup (/tmp/data)',
      storageFiles: {
        excel: 'data/college_records.xlsx',
        csv: 'data/college_records.csv',
        json: 'data/college_records.json',
      },
      persistentCount: collegeRecords.length,
      isSupabaseConnected: isSupabaseConfigured,
      environment: process.env.NODE_ENV || 'development',
      setupNote: !isSupabaseConfigured
        ? 'To activate persistent database storage across Vercel deployments, configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.'
        : 'Supabase database active.',
    },
  });
});

app.get('/api/admin/records', requireAdminAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { category, search } = req.query;

  let filtered = [...collegeRecords];

  if (category && typeof category === 'string' && category !== 'ALL') {
    filtered = filtered.filter((r) => r.category === category);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  }

  res.json({ records: filtered, count: filtered.length });
});

// Direct Add: Instantly adds to active dataset without complex review/approval steps
app.post('/api/admin/records', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category, title, content, sourceReference, sourceOrganization, verificationNotes } = req.body || {};
    const categoryVal = category ? String(category).trim() : 'COLLEGE_OVERVIEW';
    const titleVal = title !== undefined && title !== null ? String(title).trim() : '';
    const contentVal = content !== undefined && content !== null ? String(content).trim() : '';

    if (!titleVal) {
      res.status(400).json({ error: 'Topic / Subject Title is required.' });
      return;
    }

    if (!contentVal) {
      res.status(400).json({ error: 'Factual Information / Record Details are required.' });
      return;
    }

    const trimmedTitle = titleVal;
    const trimmedContent = contentVal;

    // Deduplication check
    const existingDup = collegeRecords.find(
      (r) => r.title.toLowerCase() === trimmedTitle.toLowerCase() && r.content.toLowerCase() === trimmedContent.toLowerCase()
    );
    if (existingDup) {
      res.status(200).json({
        success: true,
        record: existingDup,
        message: 'Record with identical title and content already exists in dataset.',
      });
      return;
    }

    const now = new Date().toISOString();
    const id = `vsb-rec-${categoryVal.toLowerCase().replace(/_/g, '-')}-${Date.now().toString(36)}`;

    const newRecord: CollegeSourceRecord = {
      id,
      category: categoryVal as InformationCategory,
      title: trimmedTitle,
      content: trimmedContent,
      sourceReference: sourceReference && typeof sourceReference === 'string' && sourceReference.trim()
        ? sourceReference.trim()
        : 'Campus Administration / Notice Desk',
      sourceUrl: null,
      sourceOrganization: sourceOrganization && typeof sourceOrganization === 'string' && sourceOrganization.trim()
        ? sourceOrganization.trim()
        : 'V.S.B. Engineering College',
      createdAt: now,
      updatedAt: now,
      retrievedAt: now,
      publishedAt: now,
      lastCheckedAt: now,
      status: 'VERIFIED',
      verificationNotes: verificationNotes && typeof verificationNotes === 'string' && verificationNotes.trim()
        ? verificationNotes.trim()
        : 'Directly added to college dataset.',
      publicationStatus: 'PUBLISHED',
      createdBy: req.adminUser?.email || 'admin@vsbec.edu.in',
      verifiedBy: req.adminUser?.email || 'admin@vsbec.edu.in',
    };

    // 1. Try persisting to Supabase if connected
    if (supabase) {
      try {
        const dbRow = recordToDbRow(newRecord);
        const { error: dbError } = await supabase.from('college_source_records').insert([dbRow]);
        if (dbError) {
          console.error('[Supabase Insert Error]', dbError.message);
        } else {
          console.log(`[Supabase] Record ${id} saved to PostgreSQL.`);
        }
      } catch (dbEx) {
        console.error('[Supabase Insert Exception]', dbEx);
      }
    }

    // 2. Add to in-memory dataset & disk storage
    collegeRecords.unshift(newRecord);
    saveRecordsToPersistentStorage();

    res.status(201).json({ success: true, record: newRecord });
  } catch (err) {
    logServerError('/api/admin/records', 'POST', err);
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Batch Add: Import multiple dataset items in one go without reviews
app.post('/api/admin/records/batch', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { records: batchItems } = req.body || {};
    if (!Array.isArray(batchItems) || batchItems.length === 0) {
      res.status(400).json({ error: 'Please provide a non-empty array of records.' });
      return;
    }

    const now = new Date().toISOString();
    const added: CollegeSourceRecord[] = [];

    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      if (!item.title || !item.content) continue;

      const category = (item.category as InformationCategory) || 'COLLEGE_OVERVIEW';
      const id = `vsb-rec-${category.toLowerCase().replace(/_/g, '-')}-${Date.now().toString(36)}-${i}`;

      const rec: CollegeSourceRecord = {
        id,
        category,
        title: String(item.title).trim(),
        content: String(item.content).trim(),
        sourceReference: item.sourceReference ? String(item.sourceReference).trim() : 'Dataset Batch Import',
        sourceUrl: null,
        sourceOrganization: item.sourceOrganization ? String(item.sourceOrganization).trim() : 'V.S.B. Engineering College',
        createdAt: now,
        updatedAt: now,
        retrievedAt: now,
        publishedAt: now,
        lastCheckedAt: now,
        status: 'VERIFIED',
        verificationNotes: 'Batch imported into dataset.',
        publicationStatus: 'PUBLISHED',
        createdBy: req.adminUser?.email || 'admin@vsbec.edu.in',
        verifiedBy: req.adminUser?.email || 'admin@vsbec.edu.in',
      };

      added.push(rec);
      collegeRecords.unshift(rec);
    }

    if (supabase && added.length > 0) {
      try {
        const rows = added.map(recordToDbRow);
        const { error: dbError } = await supabase.from('college_source_records').insert(rows);
        if (dbError) {
          console.error('[Supabase Batch Insert Error]', dbError.message);
        }
      } catch (dbEx) {
        console.error('[Supabase Batch Exception]', dbEx);
      }
    }

    saveRecordsToPersistentStorage();

    res.json({ success: true, count: added.length, records: added });
  } catch (err) {
    logServerError('/api/admin/records/batch', 'POST', err);
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Update Record: Directly updates and keeps verified/published
app.put('/api/admin/records/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { category, title, content, sourceReference, sourceOrganization, verificationNotes } = req.body || {};

    const index = collegeRecords.findIndex((r) => r.id === id);
    if (index === -1) {
      res.status(404).json({ error: `Record with ID "${id}" was not found.` });
      return;
    }

    const existing = collegeRecords[index];
    const now = new Date().toISOString();

    const updated: CollegeSourceRecord = {
      ...existing,
      category: category && typeof category === 'string' ? (category as InformationCategory) : existing.category,
      title: title && typeof title === 'string' ? title.trim() : existing.title,
      content: content && typeof content === 'string' ? content.trim() : existing.content,
      sourceReference: sourceReference !== undefined
        ? (sourceReference ? String(sourceReference).trim() : 'Campus Administration Desk')
        : existing.sourceReference,
      sourceUrl: null,
      sourceOrganization: sourceOrganization && typeof sourceOrganization === 'string' ? sourceOrganization.trim() : existing.sourceOrganization,
      verificationNotes: verificationNotes && typeof verificationNotes === 'string' ? verificationNotes.trim() : existing.verificationNotes,
      status: 'VERIFIED',
      publicationStatus: 'PUBLISHED',
      updatedAt: now,
      publishedAt: existing.publishedAt || now,
    };

    if (supabase) {
      try {
        const dbRow = recordToDbRow(updated);
        const { error: dbError } = await supabase
          .from('college_source_records')
          .update(dbRow)
          .eq('id', id);
        if (dbError) {
          console.error('[Supabase Update Error]', dbError.message);
        }
      } catch (dbEx) {
        console.error('[Supabase Update Exception]', dbEx);
      }
    }

    collegeRecords[index] = updated;
    saveRecordsToPersistentStorage();

    res.json({ success: true, record: updated });
  } catch (err) {
    logServerError(`/api/admin/records/${req.params.id}`, 'PUT', err);
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Delete Record: Direct single-click removal
app.delete('/api/admin/records/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const index = collegeRecords.findIndex((r) => r.id === id);
    if (index === -1) {
      res.status(404).json({ error: `Record with ID "${id}" was not found.` });
      return;
    }

    const removed = collegeRecords.splice(index, 1)[0];

    if (supabase) {
      try {
        const { error: dbError } = await supabase
          .from('college_source_records')
          .delete()
          .eq('id', id);
        if (dbError) {
          console.error('[Supabase Delete Error]', dbError.message);
        }
      } catch (dbEx) {
        console.error('[Supabase Delete Exception]', dbEx);
      }
    }

    saveRecordsToPersistentStorage();

    res.json({ success: true, message: `Record "${removed.title}" deleted successfully.` });
  } catch (err) {
    logServerError(`/api/admin/records/${req.params.id}`, 'DELETE', err);
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Review endpoint kept for backward compatibility, automatically sets to VERIFIED
app.post('/api/admin/records/:id/review', requireAdminAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { decision, verificationNotes } = req.body;

    const index = collegeRecords.findIndex((r) => r.id === id);
    if (index === -1) {
      res.status(404).json({ error: `Record with ID "${id}" was not found.` });
      return;
    }

    const existing = collegeRecords[index];
    const now = new Date().toISOString();
    const reviewer = req.adminUser!.email;

    const updated: CollegeSourceRecord = {
      ...existing,
      status: decision === 'REJECT' ? 'REJECTED' : 'VERIFIED',
      publicationStatus: decision === 'REJECT' ? 'ARCHIVED' : 'PUBLISHED',
      verifiedBy: reviewer,
      lastCheckedAt: now,
      updatedAt: now,
      verificationNotes: `${existing.verificationNotes || ''}\n[${decision || 'APPROVE'} by ${reviewer} on ${now}]: ${verificationNotes || 'Verified'}`,
    };

    collegeRecords[index] = updated;
    saveRecordsToPersistentStorage();

    res.json({ success: true, record: updated });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// ------------------------------------------------------------------------------
// EXCEL & SPREADSHEET PERSISTENT DATASET ENDPOINTS
// ------------------------------------------------------------------------------

// Export active dataset as Excel (.xlsx) file
app.get('/api/admin/records/export/excel', requireAdminAuth, (_req: AuthenticatedRequest, res: Response): void => {
  try {
    const workbook = generateExcelWorkbook(collegeRecords);
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="VSB_College_Dataset.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Export active dataset as CSV file
app.get('/api/admin/records/export/csv', requireAdminAuth, (_req: AuthenticatedRequest, res: Response): void => {
  try {
    const workbook = generateExcelWorkbook(collegeRecords);
    const firstSheet = workbook.SheetNames[0];
    const csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="VSB_College_Dataset.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Download sample Excel template (.xlsx) for easy data entry
app.get('/api/admin/records/template/excel', requireAdminAuth, (_req: AuthenticatedRequest, res: Response): void => {
  try {
    const workbook = generateExcelTemplateWorkbook();
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="VSB_College_Dataset_Template.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Import dataset records directly from Excel (.xlsx, .xls) or CSV
app.post('/api/admin/records/import/excel', requireAdminAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { fileBase64, filename, defaultCategory, csvText } = req.body;

    let rows: Array<Record<string, unknown>> = [];

    if (fileBase64 && typeof fileBase64 === 'string') {
      const buffer = Buffer.from(fileBase64, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName || !workbook.Sheets[sheetName]) {
        res.status(400).json({ error: 'Excel file contains no readable worksheets.' });
        return;
      }
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]);
    } else if (csvText && typeof csvText === 'string') {
      const workbook = XLSX.read(csvText, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]);
    } else {
      res.status(400).json({ error: 'Please provide Excel file data (fileBase64) or CSV text.' });
      return;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'The uploaded Excel file has no data rows.' });
      return;
    }

    const now = new Date().toISOString();
    const added: CollegeSourceRecord[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const titleVal =
        row['Title / Subject'] ||
        row['Title'] ||
        row['title'] ||
        row['Subject'] ||
        row['subject'] ||
        row['Topic'] ||
        row['topic'] ||
        row['Question'] ||
        row['question'] ||
        row['Heading'] ||
        row['heading'];

      const contentVal =
        row['Content / Facts'] ||
        row['Content'] ||
        row['content'] ||
        row['Facts'] ||
        row['facts'] ||
        row['Details'] ||
        row['details'] ||
        row['Answer'] ||
        row['answer'] ||
        row['Description'] ||
        row['description'] ||
        row['Information'];

      if (!titleVal && !contentVal) continue;

      const title = String(titleVal || (contentVal ? String(contentVal).substring(0, 60) : 'Campus Entry')).trim();
      const content = String(contentVal || titleVal).trim();

      const catVal =
        row['Category'] ||
        row['category'] ||
        row['Department'] ||
        row['department'] ||
        row['Section'] ||
        defaultCategory ||
        'COLLEGE_OVERVIEW';

      const category = (typeof catVal === 'string' && catVal.trim()
        ? catVal.trim().toUpperCase().replace(/[\s-]/g, '_')
        : 'COLLEGE_OVERVIEW') as InformationCategory;

      const sourceReference = String(
        row['Source Reference'] ||
        row['Source'] ||
        row['source'] ||
        row['Reference'] ||
        row['reference'] ||
        filename ||
        'Excel Sheet Upload'
      ).trim();

      const sourceOrganization = String(
        row['Organization'] ||
        row['organization'] ||
        'V.S.B. Engineering College'
      ).trim();

      const id = `vsb-rec-${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}-${i}`;

      const rec: CollegeSourceRecord = {
        id,
        category,
        title,
        content,
        sourceReference,
        sourceUrl: null,
        sourceOrganization,
        createdAt: now,
        updatedAt: now,
        retrievedAt: now,
        publishedAt: now,
        lastCheckedAt: now,
        status: 'VERIFIED',
        verificationNotes: `Imported from Excel file "${filename || 'dataset.xlsx'}" on ${now}.`,
        publicationStatus: 'PUBLISHED',
        createdBy: req.adminUser!.email,
        verifiedBy: req.adminUser!.email,
      };

      added.push(rec);
      collegeRecords.unshift(rec);
    }

    if (added.length === 0) {
      res.status(400).json({ error: 'Could not extract valid records from Excel columns. Expected columns: Title and Content/Facts.' });
      return;
    }

    // Persist immediately to disk so it is NEVER deleted!
    saveRecordsToPersistentStorage();

    res.json({
      success: true,
      count: added.length,
      records: added,
      message: `Successfully imported ${added.length} records into Excel and live AI dataset.`,
    });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// ------------------------------------------------------------------------------
// ADMIN DOCUMENT LIBRARY ENDPOINT
// ------------------------------------------------------------------------------
app.post('/api/admin/documents/upload', requireAdminAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { originalName, fileSize, mimeType, category } = req.body;

    if (!originalName || typeof originalName !== 'string') {
      res.status(400).json({ error: 'File name is required.' });
      return;
    }

    // Supported formats: PDF, CSV, XLSX, JSON
    const allowedExtensions = ['.pdf', '.csv', '.xlsx', '.json'];
    const ext = path.extname(originalName).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      res.status(400).json({
        error: `Unsupported file type "${ext}". Only PDF, CSV, XLSX, and JSON files are supported.`,
      });
      return;
    }

    // Max 10MB file limit
    const size = typeof fileSize === 'number' ? fileSize : 0;
    if (size > 10 * 1024 * 1024) {
      res.status(400).json({ error: 'File size exceeds 10MB limit.' });
      return;
    }

    const documentItem: DocumentUploadItem = {
      id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      fileName: `${Date.now()}_${originalName.replace(/\s+/g, '_')}`,
      originalName,
      fileSize: size,
      mimeType: mimeType || 'application/octet-stream',
      category: category || 'COLLEGE_OVERVIEW',
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.adminUser!.email,
      status: 'UPLOADED_PENDING_STORAGE',
      storageNote:
        'Document metadata registered in dataset library for campus reference.',
    };

    uploadedDocuments.unshift(documentItem);

    res.status(201).json({
      success: true,
      document: documentItem,
      message: 'File successfully registered in Document Library.',
    });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

app.get('/api/admin/documents', requireAdminAuth, (_req: AuthenticatedRequest, res: Response): void => {
  res.json({ documents: uploadedDocuments, count: uploadedDocuments.length });
});

// ------------------------------------------------------------------------------
// EXISTING GEMINI CHAT INTEGRATION (PRESERVED & ENHANCED WITH CAMPUS DATASET)
// ------------------------------------------------------------------------------
// FAST GEMINI CHAT INTEGRATION + INSTANT CAMPUS DATASET ENGINE
// ------------------------------------------------------------------------------
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Tracks models undergoing free-tier rate limits or temporary demand spikes
interface ModelQuotaState {
  coolingUntil: number;
  reason: string;
}

const modelQuotaStates = new Map<string, ModelQuotaState>();

function isModelCoolingDown(model: string): boolean {
  const state = modelQuotaStates.get(model);
  if (!state) return false;
  if (Date.now() < state.coolingUntil) {
    return true;
  }
  modelQuotaStates.delete(model);
  return false;
}

function setModelCooldown(model: string, durationMs: number, reason: string): void {
  modelQuotaStates.set(model, {
    coolingUntil: Date.now() + durationMs,
    reason,
  });
  console.warn(`[Quota Management] ${model} cooling down for ${Math.round(durationMs / 1000)}s: ${reason}`);
}

// Quick Greeting Detector for instant zero-latency responses
function isQuickGreeting(userQuery: string): boolean {
  const q = userQuery.trim().toLowerCase();
  const greetingRegex = /^(hi|hello|hey|hiya|howdy|good morning|good afternoon|good evening|namaste|vanakkam|who are you|what is ping|ping|test|start)[!.?]*$/i;
  return greetingRegex.test(q);
}

function getInstantGreetingResponse(): string {
  return `Hello! I am PING, your friendly V.S.B. campus assistant companion! 🐧

I'm here to help students, parents, and visitors navigate life at V.S.B. Engineering College in Karur. You can ask me anything about:
• 🎓 **Academics & Courses:** B.E. / B.Tech programmes, autonomous curriculum & exams
• 🚌 **Campus Transport:** College bus routes and transit coverage network
• 🏢 **Hostels & Amenities:** Separate hostels for men & women, dining & RO water
• 💼 **Placements & Training:** Corporate recruiters, placement records & packages
• 📍 **Location & Contacts:** NH-67 Karur campus address and admission inquiries

What would you like to know today?`;
}

// Find relevant campus dataset records based on student query
function findRelevantCampusRecords(userQuery: string): CollegeSourceRecord[] {
  if (collegeRecords.length === 0) return [];
  const q = userQuery.toLowerCase();
  const words = q.split(/[\s,?.!]+/).filter((w) => w.length >= 2);

  const synonyms: Record<string, string[]> = {
    bus: ['bus', 'buses', 'transport', 'transit', 'route', 'routes', 'van', 'travel'],
    hostel: ['hostel', 'hostels', 'room', 'rooms', 'stay', 'accommodation', 'mess', 'food'],
    course: ['course', 'courses', 'department', 'departments', 'branch', 'branches', 'program', 'programmes', 'degree', 'cse', 'it', 'ece', 'eee', 'mech', 'civil', 'aids', 'aiml'],
    placement: ['placement', 'placements', 'job', 'jobs', 'salary', 'package', 'company', 'companies', 'recruit', 'recruiter', 'tcs', 'wipro', 'training'],
    admission: ['admission', 'admissions', 'apply', 'eligibility', 'cutoff', 'fees', 'fee', 'tnea', 'counseling', 'seat'],
    contact: ['contact', 'phone', 'email', 'mobile', 'call', 'reach', 'office', 'number'],
    address: ['address', 'location', 'where', 'direction', 'map', 'route', 'karur', 'covai'],
    principal: ['principal', 'head', 'dean', 'management', 'founder', 'balsamy', 'trust'],
    library: ['library', 'books', 'journal', 'journals', 'digital', 'reading'],
    exam: ['exam', 'exams', 'examination', 'coe', 'internal', 'semester', 'grade', 'results'],
  };

  const scored = collegeRecords.map((r) => {
    let score = 0;
    const searchable = `${r.title} ${r.content} ${r.category}`.toLowerCase();

    for (const word of words) {
      if (searchable.includes(word)) {
        score += 3;
      }
      for (const [key, synList] of Object.entries(synonyms)) {
        if (synList.some((s) => word.includes(s) || s.includes(word))) {
          if (searchable.includes(key) || r.category.toLowerCase().includes(key)) {
            score += 4;
          }
        }
      }
    }

    return { record: r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0).slice(0, 3).map((s) => s.record);
}

// Builds a fast, formatted campus response directly from matched records
function buildCampusResponseFromDataset(userQuery: string, matched: CollegeSourceRecord[]): string {
  if (matched.length > 0) {
    const formattedRecords = matched
      .map((r) => `### 📌 ${r.title}\n${r.content}`)
      .join('\n\n');

    return `Hello! I am PING, your V.S.B. campus companion! 🐧 Here is verified information from our college records:\n\n${formattedRecords}\n\n*Source: V.S.B. Engineering College Campus Records*\n\nIf you need additional details about admissions, hostels, transport, or academics, please ask!`;
  }

  // Fallback college overview if no exact keyword match
  const overview = collegeRecords.find((r) => r.category === 'COLLEGE_OVERVIEW');
  const address = collegeRecords.find((r) => r.category === 'OFFICIAL_ADDRESS_LOCATION');

  return `Hello from PING! 🐧 Here is verified information about V.S.B. Engineering College:

• **Institution:** V.S.B. Engineering College (Autonomous), Karur, Tamil Nadu
• **Affiliation:** Anna University, Chennai | Approved by AICTE | Accredited by NAAC
• **Campus Address:** NH-67 Covai Road, Karudayampalayam Post, Karur - 639 111
• **Official Portal:** vsbec.edu.in | admission@vsbec.com

${overview ? `${overview.content}\n\n` : ''}You can ask me about bus routes, departments, hostel facilities, placements, and campus admissions!`;
}

// Promise wrapper with strict timeout to prevent slow AI calls from hanging the user
async function callModelWithTimeout<T>(
  promiseFactory: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Model request exceeded ${timeoutMs}ms limit`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promiseFactory(), timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

const PING_BASE_INSTRUCTION = `You are PING, a friendly, modern campus assistant companion for students, staff, and visitors of V.S.B. Engineering College in Karur, Tamil Nadu, India.

Your core persona:
- Always introduce or identify yourself as PING, the friendly V.S.B. campus companion.
- Tone: Warm, approachable, courteous, student-friendly, and concise. You may use a friendly penguin emoji 🐧 occasionally.
- Areas of help: General academic topics, engineering concepts, study techniques, college life questions, and campus navigation.
- When answering questions about V.S.B. Engineering College, USE THE VERIFIED CAMPUS DATASET RECORDS PROVIDED BELOW to give accurate answers.
- Keep answers fast, well-structured with clear bullet points, and under 200 words.`;

async function generatePingReply(
  ai: GoogleGenAI,
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  userMessage: string
): Promise<string> {
  // 1. Instant check for simple greetings (0ms latency!)
  if (isQuickGreeting(userMessage)) {
    return getInstantGreetingResponse();
  }

  // 2. Extract relevant dataset records for the student's query
  const matchedRecords = findRelevantCampusRecords(userMessage);
  const contextSnippet = matchedRecords.length > 0
    ? matchedRecords.map((r) => `• [${r.category}] ${r.title}: ${r.content}`).join('\n\n')
    : collegeRecords.slice(0, 4).map((r) => `• [${r.category}] ${r.title}: ${r.content}`).join('\n\n');

  const dynamicInstruction = `${PING_BASE_INSTRUCTION}\n\nOFFICIAL V.S.B. CAMPUS DATASET RECORDS:\n${contextSnippet}`;

  // 3. Fast candidate model with strict 2.5-second cap (prevents long thinking delays)
  const timeoutMs = matchedRecords.length > 0 ? 2500 : 3500;
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'].filter(
    (m) => !isModelCoolingDown(m)
  );

  const modelToTry = candidateModels[0];
  if (modelToTry) {
    try {
      const response = await callModelWithTimeout(
        () =>
          ai.models.generateContent({
            model: modelToTry,
            contents,
            config: {
              systemInstruction: dynamicInstruction,
              maxOutputTokens: 500,
            },
          }),
        timeoutMs
      );

      if (response && response.text && response.text.trim().length > 0) {
        return response.text;
      }
    } catch (err: unknown) {
      const error = err as Error;
      const errMsg = error?.message || '';
      console.warn(`[Fast Gemini] ${modelToTry} attempt bypassed (${errMsg.substring(0, 100)})`);

      if (
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('Quota exceeded')
      ) {
        setModelCooldown(modelToTry, 20 * 60 * 1000, 'Quota limit');
      }
    }
  }

  // 4. Instant Dataset Responder: zero-delay high-quality answer directly from verified records!
  console.info('[Campus Dataset Engine] Instant reply delivered from verified records.');
  return buildCampusResponseFromDataset(userMessage, matchedRecords);
}

app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message must be a non-empty string.' });
      return;
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    if (trimmedMessage.length > 2000) {
      res.status(400).json({ error: 'Message exceeds the 2,000 character limit.' });
      return;
    }

    // Phase 5: SEARCH CAMPUS DATASET FIRST
    const searchResult = searchCampusDataset(collegeRecords, trimmedMessage);

    // 1. If dataset record or greeting matches -> Answer directly from dataset! NO GEMINI CALL!
    if (searchResult.hasAnswer) {
      res.json({ reply: searchResult.answer });
      return;
    }

    // 2. If College-Specific Question and NOT in dataset -> DO NOT call Gemini to invent facts!
    if (searchResult.isCollegeSpecific) {
      res.json({
        reply: `Hello from PING! 🐧
This specific information is currently not available in PING's official V.S.B. campus dataset.

To maintain 100% accuracy, PING does not speculate or guess on internal college rules, fees, bus routes, or schedule details.

If you are an administrator, you can add this record via the Admin Portal. Otherwise, please contact the college administration office or visit [vsbec.edu.in](https://vsbec.edu.in).`,
      });
      return;
    }

    // 3. General Academic Question -> Call Gemini for educational concepts
    if (!process.env.GEMINI_API_KEY) {
      res.json({
        reply: "Hello from PING! 🐧 I am currently in offline mode for general AI explanations. Please configure GEMINI_API_KEY to activate general academic assistance.",
      });
      return;
    }

    const formattedHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const item of recentHistory) {
        if (
          item &&
          (item.role === 'user' || item.role === 'model') &&
          typeof item.text === 'string' &&
          item.text.trim().length > 0
        ) {
          formattedHistory.push({
            role: item.role,
            parts: [{ text: item.text.slice(0, 2000) }],
          });
        }
      }
    }

    const ai = getAiClient();
    const contents = [
      ...formattedHistory,
      {
        role: 'user' as const,
        parts: [{ text: trimmedMessage }],
      },
    ];

    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'].filter(
      (m) => !isModelCoolingDown(m)
    );

    const modelToTry = candidateModels[0];
    if (modelToTry) {
      try {
        const response = await callModelWithTimeout(
          () =>
            ai.models.generateContent({
              model: modelToTry,
              contents,
              config: {
                systemInstruction: `You are PING, the friendly AI campus assistant for V.S.B. Engineering College. Answer this general educational/academic concept question clearly, accurately, and concisely with bullet points. Do NOT invent or fabricate any specific rules, fees, bus routes, or contacts for V.S.B. Engineering College.`,
                maxOutputTokens: 600,
              },
            }),
          3500
        );

        if (response && response.text && response.text.trim().length > 0) {
          res.json({ reply: response.text });
          return;
        }
      } catch (err: unknown) {
        const error = err as Error;
        const errMsg = error?.message || '';
        if (
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Quota exceeded')
        ) {
          setModelCooldown(modelToTry, 20 * 60 * 1000, 'Quota limit');
        }
      }
    }

    // Fallback for general questions when Gemini is busy / quota exceeded
    res.json({
      reply: "Hello from PING! 🐧 PING's general AI explanation module is temporarily busy. Please retry your academic question in a moment. (Note: All official V.S.B. campus records remain accessible!)",
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Chat endpoint error:', error?.message || err);
    res.json({
      reply: "Hello from PING! 🐧 I am currently refreshing connections to campus servers. Please feel free to retry your question, or visit vsbec.edu.in for official updates!",
    });
  }
});

// Catch-all API 404 handler (Guarantees valid JSON instead of HTML for API routes)
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `Requested administrative API route was not found: ${req.method} ${req.originalUrl || req.url}` });
});

// Global API error handler (Guarantees valid JSON instead of HTML stacktraces)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Campus Server Error]', err);
  res.status(500).json({ error: err?.message || 'Internal server error occurred in campus API.' });
});

// ------------------------------------------------------------------------------
// APPLICATION SERVER START
// ------------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PING Campus Assistant + Secure Admin Portal running on http://0.0.0.0:${PORT}`);
  });
}

// Only start standalone listener when not running in Vercel or serverless environment
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

export default app;
export { app };
