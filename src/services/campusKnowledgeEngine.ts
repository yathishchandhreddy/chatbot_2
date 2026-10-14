import sourceRecordsData from '../data/collegeSourceRecords.json';
import { CollegeSourceRecord } from '../types/collegeSource';

export const verifiedCollegeRecords: CollegeSourceRecord[] = (sourceRecordsData.records || []) as CollegeSourceRecord[];

export function isQuickGreeting(msg: string): boolean {
  const clean = msg.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  return /^(hi|hello|hey|greetings|vanakkam|good morning|good afternoon|good evening|who are you|what is ping|ping|help)$/i.test(clean);
}

export function generateGreetingReply(): string {
  return "Hello! I am PING, the official AI Campus Assistant for V.S.B. Engineering College, Karur! 🐧 I can help you with admissions, departments, faculty & leadership, hostel facilities, college bus routes, exams, and placements. How may I assist you today?";
}

export function searchCampusRecords(query: string, records: CollegeSourceRecord[] = verifiedCollegeRecords): { record: CollegeSourceRecord; score: number }[] {
  const q = query.toLowerCase().trim();
  const rawWords = q.split(/[\s,?.!]+/).filter((w) => w.length > 2);
  const stem = (w: string) => w.replace(/(ing|tion|ment|ies|es|s)$/, '');
  const queryStems = rawWords.map(stem);

  const scored = records.map((record) => {
    let score = 0;
    const titleLower = record.title.toLowerCase();
    const contentLower = record.content.toLowerCase();
    const catLower = record.category.toLowerCase().replace(/_/g, ' ');

    // Exact title phrase match
    if (q.includes(titleLower) || titleLower.includes(q)) {
      score += 50;
    }

    // Direct leadership keywords boost
    if (q.includes('vice principal') && (titleLower.includes('vice principal') || contentLower.includes('vice principal'))) {
      score += 90;
    } else if ((q.includes('principal') && !q.includes('vice')) && (titleLower.includes('principal') || contentLower.includes('principal'))) {
      score += 45;
    }

    // Key categories boost
    if (q.includes('bus') || q.includes('route') || q.includes('transport') || q.includes('pickup') || q.includes('timing')) {
      if (record.category === 'TRANSPORT_INFO' || titleLower.includes('bus')) score += 35;
    }
    if (q.includes('hostel') || q.includes('room') || q.includes('mess') || q.includes('stay')) {
      if (record.category === 'HOSTEL_INFO') score += 35;
    }
    if (q.includes('admission') || q.includes('cutoff') || q.includes('tnea') || q.includes('seat') || q.includes('eligibility')) {
      if (record.category === 'ADMISSIONS_ELIGIBILITY') score += 35;
    }
    if (q.includes('placement') || q.includes('salary') || q.includes('company') || q.includes('package') || q.includes('recruitment')) {
      if (record.category === 'PLACEMENT_CAREER_SERVICES') score += 35;
    }
    if (q.includes('department') || q.includes('cse') || q.includes('ece') || q.includes('aids') || q.includes('course') || q.includes('b.e') || q.includes('b.tech')) {
      if (record.category === 'DEPARTMENTS_PROGRAMMES') score += 35;
    }

    // Word & stem matching
    for (const w of rawWords) {
      if (titleLower.includes(w)) score += 8;
      if (contentLower.includes(w)) score += 4;
      if (catLower.includes(w)) score += 3;
    }
    for (const st of queryStems) {
      if (st.length > 2) {
        if (titleLower.includes(st)) score += 4;
        if (contentLower.includes(st)) score += 2;
      }
    }

    return { record, score };
  });

  return scored.filter((item) => item.score >= 12).sort((a, b) => b.score - a.score);
}

export function formatCampusAnswer(query: string, matches: { record: CollegeSourceRecord; score: number }[]): string {
  if (matches.length === 0) {
    return "Hello! I am PING, your V.S.B. campus companion! 🐧 You can ask me about admissions, departments, hostel facilities, college bus routes, leadership, examinations, or placements.";
  }

  const top = matches.slice(0, 3);
  let reply = "Hello! I am PING, your V.S.B. campus companion! 🐧 Here is verified information from our college records:\n\n";

  for (const item of top) {
    const r = item.record;
    reply += `### 📌 ${r.title}\n${r.content}\n\n`;
  }

  reply += "Official Reference: V.S.B. Engineering College (Autonomous), Karur • vsbec.edu.in";
  return reply;
}
