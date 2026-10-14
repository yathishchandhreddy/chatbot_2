import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, FileSpreadsheet, FileCode, HardDrive, Info } from 'lucide-react';
import { DocumentUploadItem, InformationCategory } from '../../types/collegeSource';

interface DocumentLibraryProps {
  documents: DocumentUploadItem[];
  onUploadDocument: (file: File, category: InformationCategory) => Promise<void>;
  isLoading: boolean;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.csv', '.xlsx', '.json'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  documents,
  onUploadDocument,
  isLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<InformationCategory>('COLLEGE_OVERVIEW');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage(`Invalid file format "${ext}". Only PDF, CSV, XLSX, and JSON files are supported.`);
      setSelectedFile(null);
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(`File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds 10MB limit.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadProgress(25);

    try {
      setUploadProgress(65);
      await onUploadDocument(selectedFile, category);
      setUploadProgress(100);
      setSuccessMessage(`Document "${selectedFile.name}" successfully validated and registered.`);
      setSelectedFile(null);
      setTimeout(() => setUploadProgress(null), 1500);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to upload document.');
      setUploadProgress(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (mimeOrExt: string) => {
    if (mimeOrExt.includes('pdf')) return <FileText className="w-5 h-5 text-rose-500" />;
    if (mimeOrExt.includes('csv') || mimeOrExt.includes('sheet') || mimeOrExt.includes('xlsx'))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    return <FileCode className="w-5 h-5 text-sky-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Storage Backend Disclosure Banner */}
      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200/80 text-xs text-sky-950 flex items-start gap-3">
        <HardDrive className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-sky-900 flex items-center gap-2">
            <span>Document Library Infrastructure Status</span>
            <span className="text-[10px] bg-sky-200/80 px-2 py-0.5 rounded text-sky-800 font-semibold">
              Staging Mode Active
            </span>
          </div>
          <p className="text-sky-800 leading-relaxed">
            All uploaded document files (PDF, CSV, XLSX, JSON) undergo strict type and size validation on the server. To persist files permanently across container instances, configure a Supabase Storage bucket (`vsb-official-documents`) as detailed in <code className="bg-sky-100 px-1 py-0.5 rounded font-mono">db/schema.sql</code>.
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-sky-700 pt-1 font-medium">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Full text parsing, OCR, and vector embeddings will be enabled in Phase 4.</span>
          </div>
        </div>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 font-heading mb-1">
          Upload Official College Source Document
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Supported file types: PDF, CSV, XLSX, JSON (Max 10MB per file).
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-800 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Associated Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InformationCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:border-sky-500"
              >
                <option value="COLLEGE_OVERVIEW">College Overview & Accreditation</option>
                <option value="ACADEMIC_CALENDAR">Academic Calendar & Term Schedules</option>
                <option value="EXAMINATION_INFO">Examination & Grading Circulars</option>
                <option value="DEPARTMENTS_PROGRAMMES">Curriculum & Syllabi</option>
                <option value="ADMISSIONS_ELIGIBILITY">Admissions & Fee Guidelines</option>
                <option value="HOSTEL_INFO">Hostel Regulations & Fees</option>
                <option value="TRANSPORT_INFO">Transport Routes & Timetable</option>
                <option value="PLACEMENT_CAREER_SERVICES">Placement Statistics & Reports</option>
                <option value="OFFICIAL_NOTICES">Official Circulars</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select File (PDF, CSV, XLSX, JSON) *
              </label>
              <input
                type="file"
                accept=".pdf,.csv,.xlsx,.json"
                onChange={handleFileChange}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
              />
            </div>
          </div>

          {/* Progress Bar */}
          {uploadProgress !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600 font-semibold">
                <span>Validating & Staging Document...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-sky-600 h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || isLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Validate & Stage Document</span>
            </button>
          </div>
        </form>
      </div>

      {/* Document Records List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 font-heading">
            Registered Documents in Library ({documents.length})
          </h3>
          <span className="text-xs text-slate-500">Documentary Source Evidence</span>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No documents registered yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Upload official college circulars, syllabus PDFs, or fee structures above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                    {getFileIcon(doc.mimeType || doc.originalName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{doc.originalName}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>·</span>
                      <span>{doc.category}</span>
                      <span>·</span>
                      <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded px-2 py-0.5">
                    {doc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
