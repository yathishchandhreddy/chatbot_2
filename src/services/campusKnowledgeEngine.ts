import sourceRecordsData from '../data/collegeSourceRecordsData.js';
import { CollegeSourceRecord } from '../types/collegeSource.js';
import {
  searchCampusDataset,
  isQuickGreeting as searchIsQuickGreeting,
  getInstantGreetingResponse,
} from './campusSearch.js';

export const verifiedCollegeRecords: CollegeSourceRecord[] = (sourceRecordsData.records || []) as CollegeSourceRecord[];

export function isQuickGreeting(msg: string): boolean {
  return searchIsQuickGreeting(msg);
}

export function generateGreetingReply(): string {
  return getInstantGreetingResponse();
}

export function searchCampusRecords(
  query: string,
  records: CollegeSourceRecord[] = verifiedCollegeRecords
): { record: CollegeSourceRecord; score: number }[] {
  const result = searchCampusDataset(records, query);
  return result.matchedRecords.map((r) => ({ record: r, score: result.confidenceScore }));
}

export function formatCampusAnswer(
  query: string,
  matches: { record: CollegeSourceRecord; score: number }[],
  records: CollegeSourceRecord[] = verifiedCollegeRecords
): string {
  const result = searchCampusDataset(records, query);
  if (result.hasAnswer) {
    return result.answer;
  }
  return `Hello! I am PING, your V.S.B. campus companion! 🐧
This specific information is currently not available in PING's official V.S.B. campus dataset.

To maintain 100% accuracy, PING does not speculate or guess on internal college rules, fees, bus routes, or schedule details.

If you are an administrator, you can add this record via the Admin Portal. Otherwise, please contact the college administration office or visit vsbec.edu.in.`;
}
