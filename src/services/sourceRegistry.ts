import rawData from '../data/collegeSourceRecords.json';
import {
  CollegeSourceRecord,
  CollegeKnowledgeCollection,
  AdminReviewAction,
  SourceVerificationStatus,
  InformationCategory,
} from '../types/collegeSource.js';

// Typed collection reference
export const collegeKnowledgeData: CollegeKnowledgeCollection = rawData as CollegeKnowledgeCollection;

/**
 * Retrieves all registered college source records.
 */
export function getAllCollegeSourceRecords(): CollegeSourceRecord[] {
  return collegeKnowledgeData.records;
}

/**
 * Retrieves a single source record by its unique ID.
 */
export function getCollegeSourceRecordById(id: string): CollegeSourceRecord | undefined {
  return collegeKnowledgeData.records.find((rec) => rec.id === id);
}

/**
 * Retrieves records belonging to a specific information category.
 */
export function getCollegeSourceRecordsByCategory(category: InformationCategory): CollegeSourceRecord[] {
  return collegeKnowledgeData.records.filter((rec) => rec.category === category);
}

/**
 * Retrieves records matching a specific verification status.
 */
export function getCollegeSourceRecordsByStatus(status: SourceVerificationStatus): CollegeSourceRecord[] {
  return collegeKnowledgeData.records.filter((rec) => rec.status === status);
}

/**
 * Computes high-level collection statistics for review monitoring.
 */
export function getCollegeSourceCollectionStats() {
  const records = collegeKnowledgeData.records;
  return {
    totalRecords: records.length,
    unverifiedCount: records.filter((r) => r.status === 'UNVERIFIED').length,
    verifiedCount: records.filter((r) => r.status === 'VERIFIED').length,
    rejectedCount: records.filter((r) => r.status === 'REJECTED').length,
    needsReviewCount: records.filter((r) => r.status === 'NEEDS_REVIEW').length,
  };
}

/**
 * Phase 3D Review Workflow Validation
 * Validates an authorized reviewer action against verification rules.
 */
export function validateAdminReviewAction(
  record: CollegeSourceRecord,
  action: AdminReviewAction
): { isValid: boolean; reason?: string } {
  if (!action.reviewerId || action.reviewerId.trim().length === 0) {
    return { isValid: false, reason: 'Reviewer ID is required.' };
  }

  if (action.recordId !== record.id) {
    return { isValid: false, reason: 'Action recordId does not match target record ID.' };
  }

  if (!action.verificationNotes || action.verificationNotes.trim().length < 5) {
    return { isValid: false, reason: 'Verification notes must contain substantive commentary (min 5 characters).' };
  }

  return { isValid: true };
}

/**
 * Phase 3D Review Workflow State Transition
 * Pure function producing an updated record following an authorized review action.
 */
export function applyAdminReviewAction(
  record: CollegeSourceRecord,
  action: AdminReviewAction
): CollegeSourceRecord {
  const validation = validateAdminReviewAction(record, action);
  if (!validation.isValid) {
    throw new Error(`Invalid review action: ${validation.reason}`);
  }

  return {
    ...record,
    status: action.newStatus,
    lastCheckedAt: action.reviewedAt,
    verificationNotes: `${record.verificationNotes}\n[Review on ${action.reviewedAt} by ${action.reviewerId}]: ${action.verificationNotes}`,
  };
}
