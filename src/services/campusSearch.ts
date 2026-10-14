import { CollegeSourceRecord } from '../types/collegeSource.js';

export interface SearchResult {
  hasAnswer: boolean;
  isCollegeSpecific: boolean;
  isGreeting: boolean;
  answer: string;
  matchedRecords: CollegeSourceRecord[];
  confidenceScore: number;
  hasConflict: boolean;
}

const STOP_WORDS = new Set([
  'what', 'is', 'are', 'the', 'a', 'an', 'in', 'at', 'on', 'of', 'for', 'to', 'and', 'or', 'how', 'when', 'where', 'who', 'why', 'can', 'you', 'tell', 'me', 'about', 'give', 'please', 'details', 'info', 'information', 'vsb', 'college', 'engineering', 'karur', 'tamil', 'nadu'
]);

const COLLEGE_INTENT_KEYWORDS = [
  'vsb', 'karur', 'campus', 'bus', 'transport', 'route', 'driver', 'timing', 'schedule', 'pickup',
  'hostel', 'room', 'mess', 'warden', 'fee', 'fees', 'tuition', 'scholarship', 'admission', 'apply',
  'cutoff', 'tnea', 'counseling', 'principal', 'vice principal', 'dean', 'founder', 'balsamy', 'trustee',
  'placement', 'package', 'recruiter', 'tcs', 'wipro', 'cognizant', 'zoho', 'accenture', 'coe', 'exams',
  'controller', 'internal marks', 'canteen', 'sports', 'gym', 'mou', 'accreditation', 'naac', 'nba',
  'anna university', 'dress code', 'symposium', 'autonomous curriculum', 'vsbec', 'vsb college', 'karur campus'
];

const SYNONYMS: Record<string, string[]> = {
  bus: ['bus', 'buses', 'transport', 'transit', 'route', 'routes', 'van', 'travel', 'timing', 'stop', 'pickup'],
  hostel: ['hostel', 'hostels', 'room', 'rooms', 'stay', 'accommodation', 'mess', 'food', 'dining', 'warden', 'geyser'],
  course: ['course', 'courses', 'department', 'departments', 'branch', 'branches', 'program', 'programme', 'degree', 'cse', 'it', 'ece', 'eee', 'mech', 'civil', 'aids', 'aiml', 'biomedical', 'biotech', 'chemical'],
  placement: ['placement', 'placements', 'job', 'jobs', 'salary', 'package', 'company', 'companies', 'recruit', 'recruiter', 'tcs', 'wipro', 'cognizant', 'zoho', 'training'],
  admission: ['admission', 'admissions', 'apply', 'eligibility', 'cutoff', 'fees', 'fee', 'tnea', 'counseling', 'seat', 'tuition'],
  contact: ['contact', 'phone', 'email', 'mobile', 'call', 'reach', 'office', 'number', 'address', 'location'],
  principal: ['principal', 'head', 'dean', 'governance', 'management', 'founder', 'balsamy', 'trustee'],
  library: ['library', 'books', 'journal', 'journals', 'digital', 'reading', 'ndl', 'gate'],
  exam: ['exam', 'exams', 'examination', 'coe', 'internal', 'semester', 'grade', 'marks', 'results', 'controller'],
};

export function isQuickGreeting(userQuery: string): boolean {
  const q = userQuery.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  return /^(hi|hello|hey|hiya|howdy|good morning|good afternoon|good evening|namaste|vanakkam|who are you|what is ping|ping|test|start)$/i.test(q);
}

export function getInstantGreetingResponse(): string {
  return `Hello! I am PING, your friendly V.S.B. campus assistant companion! 🐧

I'm here to help students, parents, staff, and visitors navigate life at V.S.B. Engineering College in Karur. You can ask me anything about:
• 🎓 **Academics & Courses:** B.E. / B.Tech programmes, autonomous curriculum & exams
• 🚌 **Campus Transport:** College bus routes, timings and transit coverage
• 🏢 **Hostels & Amenities:** Boys & girls hostels, mess dining & Wi-Fi
• 💼 **Placements & Training:** Corporate recruiters, salary packages & training
• 📍 **Location & Contacts:** Karur campus address, phone & admission office

What would you like to know today?`;
}

export function isCollegeSpecificQuery(userQuery: string, records: CollegeSourceRecord[] = []): boolean {
  const q = userQuery.toLowerCase();
  if (COLLEGE_INTENT_KEYWORDS.some((kw) => q.includes(kw))) {
    return true;
  }
  const rawWords = q.split(/[\s,?.!/\\():"'-]+/).filter(Boolean);
  const searchTokens = rawWords.filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  if (searchTokens.length > 0 && records && records.length > 0) {
    for (const rec of records) {
      const titleLower = rec.title.toLowerCase();
      const catLower = rec.category.toLowerCase().replace(/_/g, ' ');
      for (const token of searchTokens) {
        if (titleLower.includes(token) || catLower.includes(token)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function searchCampusDataset(
  records: CollegeSourceRecord[],
  userQuery: string
): SearchResult {
  const q = userQuery.trim();
  const lowerQ = q.toLowerCase();

  if (isQuickGreeting(q)) {
    return {
      hasAnswer: true,
      isCollegeSpecific: true,
      isGreeting: true,
      answer: getInstantGreetingResponse(),
      matchedRecords: [],
      confidenceScore: 100,
      hasConflict: false,
    };
  }

  const isCollegeIntent = isCollegeSpecificQuery(q, records);

  if (!records || records.length === 0) {
    return {
      hasAnswer: false,
      isCollegeSpecific: isCollegeIntent,
      isGreeting: false,
      answer: '',
      matchedRecords: [],
      confidenceScore: 0,
      hasConflict: false,
    };
  }

  // Tokenize & normalize words
  const rawWords = lowerQ.split(/[\s,?.!/\\():"'-]+/).filter(Boolean);
  const searchTokens = rawWords.filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  const scoredRecords: Array<{ record: CollegeSourceRecord; score: number; phraseMatch: boolean }> = [];

  for (const record of records) {
    let score = 0;
    const titleLower = record.title.toLowerCase();
    const contentLower = record.content.toLowerCase();
    const catLower = record.category.toLowerCase();
    const sourceRefLower = (record.sourceReference || '').toLowerCase();

    // Exact full phrase match in title or content
    let phraseMatch = false;
    if (searchTokens.length >= 2 && (titleLower.includes(lowerQ) || contentLower.includes(lowerQ))) {
      score += 20;
      phraseMatch = true;
    }

    // Token matching
    for (const token of searchTokens) {
      if (titleLower.includes(token)) {
        score += 8;
      } else if (contentLower.includes(token)) {
        score += 4;
      }

      if (catLower.includes(token)) {
        score += 5;
      }

      if (sourceRefLower.includes(token)) {
        score += 2;
      }

      // Synonym expansion matching
      for (const [synKey, synList] of Object.entries(SYNONYMS)) {
        if (synList.includes(token)) {
          if (titleLower.includes(synKey) || catLower.includes(synKey)) {
            score += 6;
          } else if (contentLower.includes(synKey)) {
            score += 2;
          }
        }
      }
    }

    // Specific entity boosting (e.g. principal vs vice principal, bus route numbers)
    const routeMatch = lowerQ.match(/route\s*(\d+)/) || lowerQ.match(/bus\s*(\d+)/);
    if (routeMatch) {
      const num = routeMatch[1];
      if (titleLower.includes(num) || contentLower.includes(num)) {
        score += 15;
      }
    }

    if (lowerQ.includes('vice principal') && (titleLower.includes('vice principal') || contentLower.includes('vice principal'))) {
      score += 15;
    } else if (!lowerQ.includes('vice') && lowerQ.includes('principal') && titleLower.includes('principal') && !titleLower.includes('vice')) {
      score += 15;
    }

    if (score > 0) {
      scoredRecords.push({ record, score, phraseMatch });
    }
  }

  scoredRecords.sort((a, b) => b.score - a.score);

  // Confidence threshold: at least 4 points required for direct match
  const MIN_SCORE_THRESHOLD = 4;
  const topMatches = scoredRecords.filter((item) => item.score >= MIN_SCORE_THRESHOLD);

  if (topMatches.length === 0) {
    return {
      hasAnswer: false,
      isCollegeSpecific: isCollegeIntent,
      isGreeting: false,
      answer: '',
      matchedRecords: [],
      confidenceScore: 0,
      hasConflict: false,
    };
  }

  // Conflict Detection: check if top 2 records have contradictory content on same subject
  let hasConflict = false;
  const bestRecord = topMatches[0].record;
  const secondaryRecord = topMatches.length > 1 ? topMatches[1].record : null;

  if (secondaryRecord && topMatches[1].score >= topMatches[0].score * 0.8) {
    // Check if both records are on same topic but have differing content numbers or dates
    const bestNumbers = bestRecord.content.match(/\d+/g) || [];
    const secNumbers = secondaryRecord.content.match(/\d+/g) || [];
    if (bestNumbers.length > 0 && secNumbers.length > 0 && bestNumbers.join(',') !== secNumbers.join(',')) {
      if (bestRecord.title.toLowerCase().substring(0, 10) === secondaryRecord.title.toLowerCase().substring(0, 10)) {
        hasConflict = true;
      }
    }
  }

  // Take top 1 or top 2 compatible matches
  const selectedMatches = hasConflict ? [bestRecord, secondaryRecord!] : [bestRecord];
  if (!hasConflict && secondaryRecord && topMatches[1].score >= 12 && secondaryRecord.category === bestRecord.category) {
    selectedMatches.push(secondaryRecord);
  }

  // Build answer formatted directly from records
  let formattedAnswer = `Hello! I am PING, your V.S.B. campus companion! 🐧 Here is verified information from our official college records:\n\n`;

  if (hasConflict) {
    formattedAnswer += `⚠️ *Note: Our campus dataset contains two potentially conflicting entries regarding this topic. Both official entries are listed below for your review:*\n\n`;
  }

  for (const rec of selectedMatches) {
    formattedAnswer += `### 📌 ${rec.title}\n${rec.content}\n`;
    const sourceOrg = rec.sourceOrganization || 'V.S.B. Engineering College';
    const sourceRef = rec.sourceReference ? `Provided by: ${rec.sourceReference}` : 'Campus Administration';
    const updatedDate = rec.updatedAt ? new Date(rec.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null;

    formattedAnswer += `\n• **Source:** ${sourceRef} (${sourceOrg})`;
    if (updatedDate) {
      formattedAnswer += `\n• **Last Updated:** ${updatedDate}`;
    }
    formattedAnswer += `\n\n`;
  }

  formattedAnswer += `*Official Reference: V.S.B. Engineering College (Autonomous), Karur • vsbec.edu.in*`;

  return {
    hasAnswer: true,
    isCollegeSpecific: true,
    isGreeting: false,
    answer: formattedAnswer,
    matchedRecords: selectedMatches,
    confidenceScore: topMatches[0].score,
    hasConflict,
  };
}
