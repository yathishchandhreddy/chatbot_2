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
  'anna university', 'dress code', 'symposium', 'autonomous curriculum', 'vsbec', 'vsb college', 'karur campus',
  'advisor', 'adviser', 'hod', 'faculty', 'coordinator', 'incharge'
];

const ACADEMIC_ROLES = [
  'hod', 'advisor', 'adviser', 'counselor', 'principal', 'vice principal', 'dean', 'warden',
  'coordinator', 'incharge', 'in-charge', 'head', 'secretary', 'treasurer', 'president', 'trustee', 'governor', 'director'
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
  advisor: ['advisor', 'adviser', 'mentor', 'guide', 'class advisor', 'faculty advisor'],
  hod: ['hod', 'head', 'head of department', 'dept head']
};

export function isQuickGreeting(userQuery: string): boolean {
  const q = userQuery.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  return /^(hi|hello|hey|hiya|howdy|good morning|good afternoon|good evening|namaste|vanakkam|who are you|what is ping|ping|test|start|help)$/i.test(q);
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

  // Identify requested academic roles in query
  const requestedRoles = ACADEMIC_ROLES.filter((r) => searchTokens.includes(r) || lowerQ.includes(r));

  const scoredRecords: Array<{
    record: CollegeSourceRecord;
    score: number;
    coverage: number;
    hasRoleConflict: boolean;
  }> = [];

  for (const record of records) {
    let score = 0;
    const titleLower = record.title.toLowerCase();
    const contentLower = record.content.toLowerCase();
    const catLower = record.category.toLowerCase();

    // 1. Exact Title Equality (Case-insensitive)
    if (titleLower === lowerQ || titleLower.replace(/[^a-z0-9]/g, '') === lowerQ.replace(/[^a-z0-9]/g, '')) {
      score += 100;
    }

    // 2. Exact Title Phrase Inclusion
    if (lowerQ.length > 3 && titleLower.includes(lowerQ)) {
      score += 40;
    }

    // 3. Role Conflict Check
    let hasRoleConflict = false;
    if (requestedRoles.length > 0) {
      for (const reqRole of requestedRoles) {
        if (reqRole === 'advisor' || reqRole === 'adviser') {
          // Query asks for advisor. If record is HOD without mentioning advisor -> Role Conflict!
          if ((titleLower.includes('hod') || contentLower.includes('head of department')) && !titleLower.includes('advisor') && !titleLower.includes('adviser') && !contentLower.includes('advisor')) {
            hasRoleConflict = true;
          }
        } else if (reqRole === 'hod' || reqRole === 'head') {
          if ((titleLower.includes('advisor') || contentLower.includes('advisor')) && !titleLower.includes('hod') && !contentLower.includes('head')) {
            hasRoleConflict = true;
          }
        } else if (reqRole === 'vice principal') {
          if (!titleLower.includes('vice') && !contentLower.includes('vice')) {
            hasRoleConflict = true;
          }
        } else if (reqRole === 'principal' && !lowerQ.includes('vice')) {
          if (titleLower.includes('vice') || contentLower.includes('vice')) {
            hasRoleConflict = true;
          }
        }
      }
    }

    if (hasRoleConflict) {
      score -= 80;
    }

    // 4. Token Matching & Coverage Calculation
    let matchedTokenCount = 0;
    for (const token of searchTokens) {
      let tokenMatched = false;

      if (titleLower.includes(token)) {
        score += 12;
        tokenMatched = true;
      } else if (contentLower.includes(token)) {
        score += 5;
        tokenMatched = true;
      }

      if (catLower.includes(token)) {
        score += 3;
        tokenMatched = true;
      }

      if (!tokenMatched) {
        for (const [synKey, synList] of Object.entries(SYNONYMS)) {
          if (synList.includes(token)) {
            if (titleLower.includes(synKey) || catLower.includes(synKey) || contentLower.includes(synKey)) {
              score += 4;
              tokenMatched = true;
              break;
            }
          }
        }
      }

      if (tokenMatched) {
        matchedTokenCount++;
      }
    }

    const coverage = searchTokens.length > 0 ? matchedTokenCount / searchTokens.length : 0;

    // Entity specific boosting (bus routes)
    const routeMatch = lowerQ.match(/route\s*(\d+)/) || lowerQ.match(/bus\s*(\d+)/);
    if (routeMatch) {
      const num = routeMatch[1];
      if (titleLower.includes(num) || contentLower.includes(num)) {
        score += 20;
      }
    }

    if (score > 0 && !hasRoleConflict) {
      scoredRecords.push({ record, score, coverage, hasRoleConflict });
    }
  }

  scoredRecords.sort((a, b) => b.score - a.score);

  // Safe Diagnostic Logging
  console.log(`[CampusSearch] Query: "${q}" | Tokens: [${searchTokens.join(', ')}] | Evaluated Records: ${records.length}`);
  if (scoredRecords.length > 0) {
    console.log(`[CampusSearch] Top Candidates:`, scoredRecords.slice(0, 3).map(s => `ID:${s.record.id} Title:"${s.record.title}" Score:${s.score} Coverage:${(s.coverage * 100).toFixed(0)}%`));
  } else {
    console.log(`[CampusSearch] No positive matching candidate records.`);
  }

  // MINIMUM THRESHOLDS: Score >= 16 AND coverage >= 75% for multi-term queries
  const MIN_SCORE_THRESHOLD = 16;
  const topMatches = scoredRecords.filter((item) => {
    if (item.score < MIN_SCORE_THRESHOLD) return false;
    if (searchTokens.length >= 2 && item.coverage < 0.75) return false;
    return true;
  });

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

  if (secondaryRecord && topMatches[1].score >= topMatches[0].score * 0.85) {
    const bestNumbers = bestRecord.content.match(/\d+/g) || [];
    const secNumbers = secondaryRecord.content.match(/\d+/g) || [];
    if (bestNumbers.length > 0 && secNumbers.length > 0 && bestNumbers.join(',') !== secNumbers.join(',')) {
      if (bestRecord.title.toLowerCase().substring(0, 10) === secondaryRecord.title.toLowerCase().substring(0, 10)) {
        hasConflict = true;
      }
    }
  }

  const selectedMatches = hasConflict ? [bestRecord, secondaryRecord!] : [bestRecord];
  if (!hasConflict && secondaryRecord && topMatches[1].score >= 20 && secondaryRecord.category === bestRecord.category && topMatches[1].coverage >= 0.75) {
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
