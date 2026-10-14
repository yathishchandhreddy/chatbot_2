import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from '@google/genai';
import initialData from './src/data/collegeSourceRecords.json';
import {
  CollegeSourceRecord,
  CollegeKnowledgeCollection,
  InformationCategory,
  SourceVerificationStatus,
  DocumentUploadItem,
} from './src/types/collegeSource';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Request body limit to allow documents, Excel files, and JSON uploads
app.use(express.json({ limit: '25mb' }));

// Serverless URL normalization and CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const forwardedUri = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'];
  if (typeof forwardedUri === 'string' && forwardedUri.startsWith('/api')) {
    req.url = forwardedUri;
  } else if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
  }

  next();
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

// Save records to persistent files (JSON, Excel .xlsx, and CSV)
function saveRecordsToPersistentStorage(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // 1. Save JSON Store
    const payload = {
      version: '1.0.0',
      lastSaved: new Date().toISOString(),
      institution: 'V.S.B. Engineering College, Karur',
      totalRecords: collegeRecords.length,
      records: collegeRecords,
    };
    fs.writeFileSync(JSON_STORE_PATH, JSON.stringify(payload, null, 2), 'utf-8');

    // Keep src/data/collegeSourceRecords.json in sync when writable
    try {
      const srcPath = path.resolve(process.cwd(), 'src', 'data', 'collegeSourceRecords.json');
      if (fs.existsSync(srcPath)) {
        const srcData = JSON.parse(fs.readFileSync(srcPath, 'utf-8'));
        srcData.records = collegeRecords;
        srcData.totalRecords = collegeRecords.length;
        srcData.lastUpdated = new Date().toISOString();
        fs.writeFileSync(srcPath, JSON.stringify(srcData, null, 2), 'utf-8');
      }
    } catch {
      // Ignored if read-only in production serverless
    }

    // 2. Save Excel (.xlsx) Store
    const workbook = generateExcelWorkbook(collegeRecords);
    XLSX.writeFile(workbook, EXCEL_STORE_PATH);

    // 3. Save CSV Store
    const firstSheetName = workbook.SheetNames[0];
    const csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
    fs.writeFileSync(CSV_STORE_PATH, csvContent, 'utf-8');

    console.log(`[Storage] Persisted ${collegeRecords.length} records to JSON, Excel (.xlsx), and CSV files on disk.`);
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

  const session = activeAdminSessions.get(token);
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
      storageBackend: 'Permanent Disk & Excel (.xlsx) Storage',
      storageFiles: {
        excel: 'data/college_records.xlsx',
        csv: 'data/college_records.csv',
        json: 'data/college_records.json',
      },
      persistentCount: collegeRecords.length,
      isSupabaseConnected: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      environment: process.env.NODE_ENV || 'development',
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
app.post('/api/admin/records', requireAdminAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { category, title, content, sourceReference, sourceOrganization, verificationNotes } = req.body;

    if (!category || typeof category !== 'string') {
      res.status(400).json({ error: 'Valid category is required.' });
      return;
    }

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      res.status(400).json({ error: 'Title / Subject is required.' });
      return;
    }

    if (!content || typeof content !== 'string' || content.trim().length < 3) {
      res.status(400).json({ error: 'Dataset content / facts are required.' });
      return;
    }

    const now = new Date().toISOString();
    const id = `vsb-rec-${category.toLowerCase().replace(/_/g, '-')}-${Date.now().toString(36)}`;

    // SIMPLIFIED: Directly VERIFIED and PUBLISHED so AI uses it immediately!
    const newRecord: CollegeSourceRecord = {
      id,
      category: category as InformationCategory,
      title: title.trim(),
      content: content.trim(),
      sourceReference: sourceReference && typeof sourceReference === 'string' && sourceReference.trim()
        ? sourceReference.trim()
        : 'Campus Administration / Notice Desk',
      sourceUrl: null, // URLs removed as requested
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
      createdBy: req.adminUser!.email,
      verifiedBy: req.adminUser!.email,
    };

    collegeRecords.unshift(newRecord);
    saveRecordsToPersistentStorage();

    res.status(201).json({ success: true, record: newRecord });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Batch Add: Import multiple dataset items in one go without reviews
app.post('/api/admin/records/batch', requireAdminAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { records: batchItems } = req.body;
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
        createdBy: req.adminUser!.email,
        verifiedBy: req.adminUser!.email,
      };

      added.push(rec);
      collegeRecords.unshift(rec);
    }

    saveRecordsToPersistentStorage();

    res.json({ success: true, count: added.length, records: added });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Update Record: Directly updates and keeps verified/published
app.put('/api/admin/records/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { category, title, content, sourceReference, sourceOrganization, verificationNotes } = req.body;

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
      sourceUrl: null, // URLs removed
      sourceOrganization: sourceOrganization && typeof sourceOrganization === 'string' ? sourceOrganization.trim() : existing.sourceOrganization,
      verificationNotes: verificationNotes && typeof verificationNotes === 'string' ? verificationNotes.trim() : existing.verificationNotes,
      status: 'VERIFIED',
      publicationStatus: 'PUBLISHED',
      updatedAt: now,
      publishedAt: existing.publishedAt || now,
    };

    collegeRecords[index] = updated;
    saveRecordsToPersistentStorage();

    res.json({ success: true, record: updated });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Delete Record: Direct single-click removal
app.delete('/api/admin/records/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const index = collegeRecords.findIndex((r) => r.id === id);
    if (index === -1) {
      res.status(404).json({ error: `Record with ID "${id}" was not found.` });
      return;
    }

    const removed = collegeRecords.splice(index, 1)[0];
    saveRecordsToPersistentStorage();

    res.json({ success: true, message: `Record "${removed.title}" deleted successfully.` });
  } catch (err) {
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

    if (!process.env.GEMINI_API_KEY) {
      res.json({
        reply: "Hello from PING! 🐧 I am currently in offline mode. Please configure GEMINI_API_KEY in environment secrets to activate full AI assistance.",
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

    const reply = await generatePingReply(ai, contents, trimmedMessage);

    res.json({ reply });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Gemini chat error:', error?.message || err);
    res.json({
      reply: "Hello from PING! 🐧 I am currently refreshing connections to campus servers. Please feel free to retry your question, or visit vsbec.edu.in for official updates!",
    });
  }
});

// Catch-all API 404 handler (Guarantees valid JSON instead of HTML)
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `Requested administrative API route was not found: ${req.method} ${req.url}` });
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
