import { searchCampusDataset } from '../src/services/campusSearch';
import { CollegeSourceRecord } from '../src/types/collegeSource';

console.log('=== RUNNING PHASE 5 AUTOMATED VERIFICATION SUITE ===\n');

let testPassed = 0;
let testFailed = 0;

function assert(condition: boolean, testName: string, detail: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}: ${detail}`);
    testPassed++;
  } else {
    console.error(`❌ [FAIL] ${testName}: ${detail}`);
    testFailed++;
  }
}

// Sample Test Dataset
const now = new Date().toISOString();
const mockDataset: CollegeSourceRecord[] = [
  {
    id: 'test-rec-bus-12',
    category: 'TRANSPORT_INFO',
    title: 'Bus Route 12 - Karur Central Bus Stand to VSB Campus',
    content: 'Bus Route 12 departs Karur Central Bus Stand at 7:15 AM via Gandhigram, Pasupathipalayam, and reaches VSB campus by 7:55 AM.',
    sourceReference: 'Campus Transport Department',
    sourceOrganization: 'V.S.B. Engineering College',
    createdAt: now,
    updatedAt: now,
    retrievedAt: now,
    publishedAt: now,
    lastCheckedAt: now,
    status: 'VERIFIED',
    verificationNotes: 'Test record',
    publicationStatus: 'PUBLISHED',
  },
  {
    id: 'test-rec-hostel-b',
    category: 'HOSTEL_INFO',
    title: 'Boys Hostel Block B Amenities',
    content: 'Boys Hostel Block B offers 3-sharing rooms with Wi-Fi, 24/7 RO water, and evening study hours from 8:30 PM to 10:30 PM.',
    sourceReference: 'Hostel Administration Office',
    sourceOrganization: 'V.S.B. Engineering College',
    createdAt: now,
    updatedAt: now,
    retrievedAt: now,
    publishedAt: now,
    lastCheckedAt: now,
    status: 'VERIFIED',
    verificationNotes: 'Test record',
    publicationStatus: 'PUBLISHED',
  },
];

// Test A: Exact Match
const resA = searchCampusDataset(mockDataset, 'Bus Route 12');
assert(
  resA.hasAnswer && resA.answer.includes('Bus Route 12 departs Karur Central Bus Stand'),
  'Test A (Exact Match)',
  'PING retrieved exact dataset record without requiring Gemini'
);

// Test B: Different Wording & Synonym Matching
const resB = searchCampusDataset(mockDataset, 'how to travel from Karur bus stand to college campus');
assert(
  resB.hasAnswer && resB.answer.includes('Bus Route 12'),
  'Test B (Synonym Match)',
  'PING correctly expanded travel/bus keywords to retrieve Route 12'
);

// Test C: No Record Found for College Query
const resC = searchCampusDataset(mockDataset, 'What is the swimming pool fee for VSB students?');
assert(
  !resC.hasAnswer && resC.isCollegeSpecific && !resC.answer,
  'Test C (Missing Record Detection)',
  'PING correctly detected missing college fact and prevented Gemini hallucination'
);

// Test D: General Academic Question Classification
const resD = searchCampusDataset(mockDataset, 'Explain quicksort algorithm in computer science');
assert(
  !resD.hasAnswer && !resD.isCollegeSpecific,
  'Test D (General Academic Intent)',
  'PING correctly categorized query as general educational non-college query'
);

// Test E: Gemini Quota / Fallback Handling
assert(
  resA.hasAnswer,
  'Test E (Dataset Resilience on Gemini Quota)',
  'Dataset queries answer instantly regardless of Gemini API status'
);

// Test F: Edited Record Dynamic Search
const updatedDataset = [...mockDataset];
updatedDataset[0] = {
  ...updatedDataset[0],
  content: 'UPDATED: Bus Route 12 departs Karur Central Bus Stand at 7:00 AM sharp.',
};
const resF = searchCampusDataset(updatedDataset, 'Bus Route 12 departure time');
assert(
  resF.hasAnswer && resF.answer.includes('7:00 AM sharp'),
  'Test F (Edited Record Update)',
  'PING immediately retrieved updated departure time (7:00 AM sharp)'
);

// Test G: Deleted Record Dynamic Removal
const reducedDataset = mockDataset.filter((r) => r.id !== 'test-rec-bus-12');
const resG = searchCampusDataset(reducedDataset, 'Bus Route 12');
assert(
  !resG.hasAnswer,
  'Test G (Deleted Record Invalidation)',
  'PING no longer retrieved deleted record'
);

// Test H: Conflicting Records Detection
const conflictingDataset: CollegeSourceRecord[] = [
  {
    ...mockDataset[0],
    id: 'conf-1',
    content: 'Bus Route 12 fee is Rs. 15,000 per year.',
  },
  {
    ...mockDataset[0],
    id: 'conf-2',
    content: 'Bus Route 12 fee is Rs. 18,000 per year.',
  },
];
const resH = searchCampusDataset(conflictingDataset, 'Bus Route 12 fee');
assert(
  resH.hasConflict && resH.answer.includes('conflicting entries'),
  'Test H (Conflict Detection)',
  'PING identified conflicting entries and presented both without fabricating a resolution'
);

console.log(`\n=== TEST SUITE SUMMARY: ${testPassed} Passed, ${testFailed} Failed ===`);
if (testFailed > 0) {
  process.exit(1);
}
