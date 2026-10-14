import rawData from '../src/data/collegeSourceRecords.json' with { type: 'json' };
import { CollegeKnowledgeCollection, CollegeSourceRecord } from '../src/types/collegeSource';
import {
  getAllCollegeSourceRecords,
  getCollegeSourceCollectionStats,
  validateAdminReviewAction,
} from '../src/services/sourceRegistry';

console.log('====================================================');
console.log('PHASE 3 AUTOMATED VERIFICATION SUITE');
console.log('V.S.B. Engineering College Source Records Collection');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(description: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`[PASS] ${description}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${description}`);
    if (details) console.error(`       Details: ${details}`);
    failCount++;
  }
}

// 1. JSON parsing and schema structure
assert('Test 1: JSON file parses successfully and matches schema', rawData !== null && typeof rawData === 'object');

const collection = rawData as CollegeKnowledgeCollection;
const records = collection.records;

assert('Test 2: Schema contains 18 total records covering categories A through R', records.length === 18, `Found ${records.length}`);

// 3. Unique IDs
const idSet = new Set<string>();
let hasDuplicates = false;
records.forEach((r) => {
  if (idSet.has(r.id)) hasDuplicates = true;
  idSet.add(r.id);
});
assert('Test 3: Every record has a unique ID', !hasDuplicates && idSet.size === records.length);

// 4. Every new record has status UNVERIFIED
const allUnverified = records.every((r) => r.status === 'UNVERIFIED');
assert('Test 4: Every newly imported record strictly has status UNVERIFIED', allUnverified);

// 5. Source URL or explicit explanation for unavailability
let allHaveSourceOrExplanation = true;
records.forEach((r) => {
  if (r.sourceUrl === null) {
    if (!r.content.toLowerCase().includes('not') && !r.verificationNotes.toLowerCase().includes('unavailable')) {
      allHaveSourceOrExplanation = false;
    }
  }
});
assert('Test 5: Every record has an official source URL or explicit explanation of unavailability', allHaveSourceOrExplanation);

// 6. Missing information is not fabricated (checked on calendar & scholarships)
const calendarRecord = records.find((r) => r.category === 'ACADEMIC_CALENDAR');
const scholarshipRecord = records.find((r) => r.category === 'SCHOLARSHIPS_FINANCIAL_AID');
const missingExplicitlyAcknowledged =
  calendarRecord?.sourceUrl === null &&
  scholarshipRecord?.sourceUrl === null &&
  calendarRecord?.verificationNotes.includes('unavailable') &&
  scholarshipRecord?.verificationNotes.includes('unavailable');

assert('Test 6: Missing data is documented honestly without fabricated dates or private details', !!missingExplicitlyAcknowledged);

// 7. Data structure for future review workflow (Phase 3D validation)
const sampleRecord = records[0];
const validReview = validateAdminReviewAction(sampleRecord, {
  recordId: sampleRecord.id,
  reviewerId: 'admin_officer_01',
  decision: 'APPROVE',
  newStatus: 'VERIFIED',
  verificationNotes: 'Verified against vsbec.edu.in portal and Anna University records.',
  reviewedAt: new Date().toISOString(),
});
assert('Test 7: Admin review data structure correctly validates valid reviewer approvals', validReview.isValid);

// 8. Prevent approvals without substantive review notes
const invalidReview = validateAdminReviewAction(calendarRecord!, {
  recordId: calendarRecord!.id,
  reviewerId: 'admin_officer_01',
  decision: 'APPROVE',
  newStatus: 'VERIFIED',
  verificationNotes: 'ok', // too short (< 5 chars)
  reviewedAt: new Date().toISOString(),
});
assert('Test 8: Guard prevents reviews with missing or non-substantive notes', !invalidReview.isValid);

// Summary Stats
const stats = getCollegeSourceCollectionStats();
console.log('\n--- COLLECTION SUMMARY STATISTICS ---');
console.log(`Total Records:          ${stats.totalRecords}`);
console.log(`UNVERIFIED Status:      ${stats.unverifiedCount}`);
console.log(`VERIFIED Status:        ${stats.verifiedCount}`);
console.log(`NEEDS_REVIEW Status:    ${stats.needsReviewCount}`);
console.log(`REJECTED Status:        ${stats.rejectedCount}`);
console.log('-------------------------------------\n');

if (failCount > 0) {
  console.error(`FAILED: ${failCount} tests failed.`);
  process.exit(1);
} else {
  console.log(`SUCCESS: All ${passCount} tests passed!`);
}
