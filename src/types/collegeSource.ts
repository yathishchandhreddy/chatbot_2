/**
 * Phase 3: Official College Information Collection & Admin Portal Types
 * V.S.B. Engineering College, Karur, Tamil Nadu
 */

export type InformationCategory =
  | 'COLLEGE_OVERVIEW'
  | 'OFFICIAL_ADDRESS_LOCATION'
  | 'CONTACT_DETAILS'
  | 'DEPARTMENTS_PROGRAMMES'
  | 'ADMISSIONS_ELIGIBILITY'
  | 'ACADEMIC_CALENDAR'
  | 'EXAMINATION_INFO'
  | 'FACULTY_DEPARTMENT_CONTACTS'
  | 'CAMPUS_FACILITIES'
  | 'LIBRARY_FACILITIES'
  | 'HOSTEL_INFO'
  | 'TRANSPORT_INFO'
  | 'SCHOLARSHIPS_FINANCIAL_AID'
  | 'PLACEMENT_CAREER_SERVICES'
  | 'STUDENT_ACTIVITIES_CLUBS'
  | 'REGULATIONS_POLICIES'
  | 'OFFICIAL_NOTICES'
  | 'FREQUENTLY_ASKED_QUESTIONS';

export type SourceVerificationStatus =
  | 'UNVERIFIED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'NEEDS_REVIEW';

export type PublicationStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface CollegeSourceRecord {
  /** Unique deterministic identifier, e.g. "vsb-rec-overview-01" */
  id: string;
  /** Primary category (A through R) */
  category: InformationCategory;
  /** Human-readable headline describing the record */
  title: string;
  /** Factual textual content retrieved from official sources, or explicit unavailability note */
  content: string;
  /** Primary official source reference (e.g., Notice Board, Circular, Handbook, Office Record, or optional link) */
  sourceReference?: string | null;
  /** Optional web URL, if available */
  sourceUrl?: string | null;
  /** Authority or organization publishing the source (e.g. "V.S.B. Engineering College", "Anna University", "AICTE") */
  sourceOrganization: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last-updated timestamp */
  updatedAt: string;
  /** ISO 8601 timestamp when content was retrieved by collector */
  retrievedAt: string;
  /** ISO 8601 timestamp or date string when source was originally published, if available */
  publishedAt: string | null;
  /** ISO 8601 timestamp when the source was last confirmed active */
  lastCheckedAt: string;
  /** Verification lifecycle status. All newly imported records start as UNVERIFIED */
  status: SourceVerificationStatus;
  /** Verification notes detailing provenance, review status, or pending items */
  verificationNotes: string;
  /** Publication lifecycle status */
  publicationStatus: PublicationStatus;
  /** Staff reviewer ID who verified this record, if verified */
  verifiedBy?: string | null;
  /** Staff creator ID who drafted this record */
  createdBy?: string | null;
}

/**
 * Data structures for authorized admin review workflow (Phase 3D)
 */
export interface AdminReviewAction {
  recordId: string;
  reviewerId: string;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  newStatus: SourceVerificationStatus;
  verificationNotes: string;
  reviewedAt: string;
  sourceComparisonDiff?: string;
}

export interface CollegeKnowledgeCollection {
  schemaVersion: string;
  lastUpdated: string;
  officialDomain: string;
  institutionName: string;
  totalRecords: number;
  statusCounts: {
    unverified: number;
    verified: number;
    rejected: number;
    needsReview: number;
  };
  records: CollegeSourceRecord[];
}

/**
 * Admin Document Library Types
 */
export interface DocumentUploadItem {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  category: InformationCategory;
  uploadedAt: string;
  uploadedBy: string;
  status: 'UPLOADED_PENDING_STORAGE' | 'STORED' | 'FAILED';
  storageNote: string;
}

/**
 * Admin User Profile
 */
export interface AdminUserProfile {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ACADEMIC_ADMIN' | 'REVIEWER';
  department?: string;
  sessionToken: string;
  authenticatedAt: string;
}
