import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import initialData from '../src/data/collegeSourceRecordsData.js';
import { searchCampusDataset } from '../src/services/campusSearch.js';
import { CollegeSourceRecord } from '../src/types/collegeSource.js';

// Initialize Supabase Client dynamically for Vercel Serverless environment
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.error('[Chat API] Failed to initialize Supabase client:', err);
  }
}

function dbRowToRecord(row: any): CollegeSourceRecord {
  return {
    id: String(row.id),
    category: row.category || 'COLLEGE_OVERVIEW',
    title: String(row.title || ''),
    content: String(row.content || ''),
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

async function loadLiveCampusRecords(): Promise<CollegeSourceRecord[]> {
  const recordMap = new Map<string, CollegeSourceRecord>();

  // 1. Seed static initial records
  const initial = ((initialData as any).records || []) as CollegeSourceRecord[];
  for (const r of initial) {
    if (r && r.id) {
      recordMap.set(r.id, {
        ...r,
        status: 'VERIFIED',
        publicationStatus: 'PUBLISHED',
      });
    }
  }

  // 2. Overlay disk records if present
  try {
    const dataPaths = [
      path.resolve('/tmp', 'data', 'college_records.json'),
      path.resolve(process.cwd(), 'data', 'college_records.json'),
    ];

    for (const p of dataPaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0) {
          for (const r of parsed.records) {
            if (r && r.id) {
              recordMap.set(r.id, r);
            }
          }
          break;
        }
      }
    }
  } catch (diskErr) {
    console.warn('[Chat API] Disk read notice:', diskErr);
  }

  // 3. Overlay live records from Supabase database (HIGHEST PRIORITY PERSISTENT SOURCE OF TRUTH!)
  if (supabase) {
    try {
      const { data, error } = await supabase.from('college_source_records').select('*');
      if (error) {
        console.error('[Chat API] Supabase query error:', error.message);
      } else if (Array.isArray(data) && data.length > 0) {
        for (const row of data) {
          const rec = dbRowToRecord(row);
          if (rec && rec.id) {
            recordMap.set(rec.id, rec);
          }
        }
      }
    } catch (dbErr) {
      console.error('[Chat API] Supabase exception during live fetch:', dbErr);
    }
  }

  return Array.from(recordMap.values());
}

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    const liveRecords = await loadLiveCampusRecords();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'ok',
      service: 'PING Campus Chat API',
      recordsCount: liveRecords.length,
      supabaseConnected: !!supabase,
    }));
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    } else if (!body) {
      body = {};
    }

    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!message) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ reply: "Hello from PING! 🐧 How can I assist you with V.S.B. Engineering College today?" }));
      return;
    }

    // Load active college dataset records live from Supabase + Disk + Seed
    const records = await loadLiveCampusRecords();

    // Search existing college dataset
    const searchResult = searchCampusDataset(records, message);

    // If dataset contains the answer or it's a greeting -> Return dataset answer directly! NO GEMINI CALL!
    if (searchResult.hasAnswer) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ reply: searchResult.answer }));
      return;
    }

    // If question is College-Specific and NOT found in dataset -> Do NOT call Gemini to fabricate facts!
    if (searchResult.isCollegeSpecific) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        reply: `Hello from PING! 🐧
This specific information is currently not available in PING's official V.S.B. campus dataset.

To maintain 100% accuracy, PING does not speculate or guess on internal college rules, fees, bus routes, or schedule details.

If you are an administrator, you can add this record via the Admin Portal. Otherwise, please contact the college administration office or visit [vsbec.edu.in](https://vsbec.edu.in).`
      }));
      return;
    }

    // General Academic Question -> Call Gemini for educational concepts
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Context building with live records
      const contextSnippet = records
        .slice(0, 10)
        .map((r) => `• [${r.category}] ${r.title}: ${r.content}`)
        .join('\n\n');

      for (const modelName of candidateModels) {
        try {
          const result = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents: [{ role: 'user', parts: [{ text: message }] }],
              config: {
                systemInstruction: `You are PING, the friendly AI campus assistant for V.S.B. Engineering College in Karur.
Answer this general educational/academic concept question clearly, accurately, and concisely.
Keep formatting clean with bullet points.
Official Campus Context Reference:
${contextSnippet}

Do NOT invent or fabricate any specific rules, fees, bus routes, or contacts for V.S.B. Engineering College.`,
                temperature: 0.3,
                maxOutputTokens: 600,
              }
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3500))
          ]) as any;

          if (result?.text) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ reply: result.text }));
            return;
          }
        } catch {
          // Try next model or fallback
        }
      }
    }

    // Fallback for general question when Gemini is busy / quota exceeded
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      reply: "Hello from PING! 🐧 PING's general AI explanation module is temporarily busy. Please retry your academic question in a moment. (Note: All official V.S.B. campus records remain accessible!)"
    }));
  } catch (err: any) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      reply: "Hello from PING! 🐧 I am currently refreshing connections to campus servers. Please feel free to retry your question, or visit vsbec.edu.in for official updates!"
    }));
  }
}
