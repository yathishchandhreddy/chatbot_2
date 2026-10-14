import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import initialData from '../src/data/collegeSourceRecords.json';

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

    // 1. Quick greeting check
    const cleanMsg = message.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    if (/^(hi|hello|hey|greetings|vanakkam|good morning|good afternoon|good evening|who are you|ping|help)$/i.test(cleanMsg)) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        reply: "Hello! I am PING, the official AI Campus Assistant for V.S.B. Engineering College, Karur! 🐧 I can help you with admissions, departments, faculty & leadership, hostel facilities, college bus routes, exams, and placements. How may I assist you today?"
      }));
      return;
    }

    let records = (initialData.records || []) as any[];
    try {
      const dataFilePath = path.resolve(process.cwd(), 'data', 'college_records.json');
      if (fs.existsSync(dataFilePath)) {
        const raw = fs.readFileSync(dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0) {
          records = parsed.records;
        }
      }
    } catch {
      // Fallback to initialData
    }

    const q = message.toLowerCase();

    // 2. Exact leadership / high-priority matching (e.g. vice principal, principal, trustee)
    const matchedRecord = records.find((r: any) => {
      const title = (r.title || '').toLowerCase();
      const content = (r.content || '').toLowerCase();

      if (q.includes('vice principal') && (title.includes('vice principal') || content.includes('vice principal'))) {
        return true;
      }
      if (!q.includes('vice') && q.includes('principal') && (title.includes('principal') || content.includes('principal'))) {
        return true;
      }
      if (q.includes('balsamy') || q.includes('founder') || q.includes('trustee')) {
        return title.includes('governance') || content.includes('balsamy');
      }
      return false;
    });

    if (matchedRecord) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        reply: `Hello! I am PING, your V.S.B. campus companion! 🐧 Here is verified information from our college records:\n\n### 📌 ${matchedRecord.title}\n${matchedRecord.content}\n\nOfficial Reference: V.S.B. Engineering College (Autonomous), Karur • vsbec.edu.in`
      }));
      return;
    }

    // 3. Try Gemini API if key is present on Vercel
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
      const contextFacts = records.slice(0, 15).map((r: any) => `[${r.title}]: ${r.content}`).join('\n\n');

      for (const modelName of candidateModels) {
        try {
          const result = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents: [{ role: 'user', parts: [{ text: message }] }],
              config: {
                systemInstruction: `You are PING, the friendly AI campus assistant for V.S.B. Engineering College (Autonomous), Karur.
Verified campus facts:\n${contextFacts}
Answer clearly and helpfully based on the campus facts. Keep answers concise, accurate, and friendly with a penguin spirit (🐧).`,
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
          // Try next model
        }
      }
    }

    // 4. Keyword search over verified campus records
    const keywords = q.split(/[\s,?.!]+/).filter((w: string) => w.length > 3);
    const scored = records.map((r: any) => {
      let score = 0;
      const title = (r.title || '').toLowerCase();
      const content = (r.content || '').toLowerCase();
      for (const kw of keywords) {
        if (title.includes(kw)) score += 5;
        if (content.includes(kw)) score += 2;
      }
      return { record: r, score };
    }).filter((item: any) => item.score > 0).sort((a: any, b: any) => b.score - a.score);

    if (scored.length > 0) {
      const top = scored.slice(0, 2);
      let reply = "Hello! I am PING, your V.S.B. campus companion! 🐧 Here is verified information from our college records:\n\n";
      for (const item of top) {
        reply += `### 📌 ${item.record.title}\n${item.record.content}\n\n`;
      }
      reply += "Official Reference: V.S.B. Engineering College (Autonomous), Karur • vsbec.edu.in";

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ reply }));
      return;
    }

    // Default friendly response
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      reply: "Hello from PING! 🐧 I'm here to assist with questions about V.S.B. Engineering College. You can ask about our autonomous curriculum, hostel facilities, bus routes, cutoff, or placements!"
    }));
  } catch (err: any) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      reply: "Hello from PING! 🐧 I am currently refreshing connections to campus servers. Please feel free to retry your question, or visit vsbec.edu.in for updates!"
    }));
  }
}
