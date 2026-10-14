-- ==============================================================================
-- PING Campus Assistant - PostgreSQL / Supabase Production Schema
-- V.S.B. Engineering College, Karur, Tamil Nadu
-- Phase 3: Secure Admin Portal & Knowledge Repository Architecture
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ADMIN USERS TABLE (Role-Based Access Control)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'REVIEWER')),
    department VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. COLLEGE SOURCE RECORDS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.college_source_records (
    id VARCHAR(100) PRIMARY KEY,
    category VARCHAR(60) NOT NULL CHECK (category IN (
        'COLLEGE_OVERVIEW',
        'OFFICIAL_ADDRESS_LOCATION',
        'CONTACT_DETAILS',
        'DEPARTMENTS_PROGRAMMES',
        'ADMISSIONS_ELIGIBILITY',
        'ACADEMIC_CALENDAR',
        'EXAMINATION_INFO',
        'FACULTY_DEPARTMENT_CONTACTS',
        'CAMPUS_FACILITIES',
        'LIBRARY_FACILITIES',
        'HOSTEL_INFO',
        'TRANSPORT_INFO',
        'SCHOLARSHIPS_FINANCIAL_AID',
        'PLACEMENT_CAREER_SERVICES',
        'STUDENT_ACTIVITIES_CLUBS',
        'REGULATIONS_POLICIES',
        'OFFICIAL_NOTICES',
        'FREQUENTLY_ASKED_QUESTIONS'
    )),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    source_url TEXT,
    source_organization VARCHAR(150) NOT NULL,
    retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED' CHECK (status IN ('UNVERIFIED', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW')),
    verification_notes TEXT NOT NULL DEFAULT '',
    publication_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (publication_status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    verified_by VARCHAR(150),
    created_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for category and status filtering
CREATE INDEX IF NOT EXISTS idx_records_category ON public.college_source_records(category);
CREATE INDEX IF NOT EXISTS idx_records_status ON public.college_source_records(status);
CREATE INDEX IF NOT EXISTS idx_records_publication ON public.college_source_records(publication_status);

-- ------------------------------------------------------------------------------
-- 3. AUDIT LOG TABLE (Review & Approval History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.source_review_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id VARCHAR(100) NOT NULL REFERENCES public.college_source_records(id) ON DELETE CASCADE,
    reviewer_id VARCHAR(150) NOT NULL,
    decision VARCHAR(30) NOT NULL CHECK (decision IN ('APPROVE', 'REJECT', 'REQUEST_CHANGES')),
    previous_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    verification_notes TEXT NOT NULL,
    source_comparison_diff TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_record_id ON public.source_review_audit_log(record_id);

-- ------------------------------------------------------------------------------
-- 4. DOCUMENT UPLOADS TABLE (Document Library)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL CHECK (mime_type IN (
        'application/pdf',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json'
    )),
    category VARCHAR(60) NOT NULL,
    storage_bucket_path TEXT,
    upload_status VARCHAR(30) NOT NULL DEFAULT 'UPLOADED_PENDING_STORAGE' CHECK (
        upload_status IN ('UPLOADED_PENDING_STORAGE', 'STORED', 'FAILED')
    ),
    uploaded_by VARCHAR(150) NOT NULL,
    storage_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_review_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_uploads ENABLE ROW LEVEL SECURITY;

-- Students (anon/public) have zero direct access to administrative tables
-- Authenticated service roles / authorized staff can query and review
CREATE POLICY "Admins have full access to college source records"
    ON public.college_source_records
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'authenticated');

CREATE POLICY "Admins have full access to document uploads"
    ON public.document_uploads
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'authenticated');

CREATE POLICY "Reviewers can write review audit logs"
    ON public.source_review_audit_log
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'authenticated');
