# V.S.B. Engineering College — Database & Auth Setup Guide (Phase 3)

This application has been prepared for full persistent storage and authenticated administrative workflows using PostgreSQL / Supabase.

---

## 1. Current State vs Production Storage

- **Current State (Phase 3 Prototype)**:
  - Source records are loaded from the structured, validated repository `src/data/collegeSourceRecords.json` and held in-memory/in-state on the server.
  - Server-side administrative authentication is enforced via `/api/admin/*` endpoints using secure cryptographic tokens and `ADMIN_SECRET_KEY`.
  - When no external database is connected, real in-memory and local repository counts are displayed without fabricating stats.

- **Production Target (Supabase / PostgreSQL)**:
  - Persistent storage across server restarts and multiple concurrent administrators.
  - Row Level Security (RLS) ensuring strict role separation between student users and campus staff.
  - Storage bucket integration for PDF, CSV, XLSX, and JSON documents.

---

## 2. Setting Up Supabase Database & Auth

1. **Create Supabase Project**:
   - Go to [Supabase](https://supabase.com) and create a project for `vsb-campus-assistant`.

2. **Execute Schema**:
   - In Supabase SQL Editor, paste and execute `db/schema.sql`.
   - This creates `admin_users`, `college_source_records`, `source_review_audit_log`, and `document_uploads`, with RLS enabled.

3. **Configure Environment Variables**:
   Add the following secrets to your environment / `.env`:
   ```bash
   # Dedicated admin secret key for server API authorization
   ADMIN_SECRET_KEY="your-secure-admin-passphrase-or-key"

   # Supabase connection (when enabling direct Supabase integration)
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-secure-service-role-key"
   ```

4. **Storage Bucket**:
   - Create a private storage bucket named `vsb-official-documents`.
   - Restrict access to authenticated administrators only.
