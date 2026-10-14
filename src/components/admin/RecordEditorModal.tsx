import React, { useState, useEffect } from 'react';
import { X, Save, CheckCircle2 } from 'lucide-react';
import { CollegeSourceRecord, InformationCategory } from '../../types/collegeSource';

interface RecordEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit: CollegeSourceRecord | null;
  onSaveRecord: (recordData: Partial<CollegeSourceRecord>) => Promise<void>;
  isLoading: boolean;
}

const CATEGORY_OPTIONS: Array<{ value: InformationCategory; label: string }> = [
  { value: 'COLLEGE_OVERVIEW', label: '1. College Overview & History' },
  { value: 'OFFICIAL_ADDRESS_LOCATION', label: '2. Official Address and Location' },
  { value: 'CONTACT_DETAILS', label: '3. Contact Details & Helpdesk' },
  { value: 'DEPARTMENTS_PROGRAMMES', label: '4. Departments and Programmes' },
  { value: 'ADMISSIONS_ELIGIBILITY', label: '5. Admissions & Eligibility (TNEA)' },
  { value: 'ACADEMIC_CALENDAR', label: '6. Academic Calendar & Term Dates' },
  { value: 'EXAMINATION_INFO', label: '7. Examination Information (COE)' },
  { value: 'FACULTY_DEPARTMENT_CONTACTS', label: '8. Faculty & Department Desks' },
  { value: 'CAMPUS_FACILITIES', label: '9. Campus Facilities & Utilities' },
  { value: 'LIBRARY_FACILITIES', label: '10. Library Facilities & Working Hours' },
  { value: 'HOSTEL_INFO', label: '11. Hostel Information (Men & Women)' },
  { value: 'TRANSPORT_INFO', label: '12. Transport & Bus Routes' },
  { value: 'SCHOLARSHIPS_FINANCIAL_AID', label: '13. Scholarships & Financial Aid' },
  { value: 'PLACEMENT_CAREER_SERVICES', label: '14. Placement & Career Services' },
  { value: 'STUDENT_ACTIVITIES_CLUBS', label: '15. Student Activities and Clubs' },
  { value: 'REGULATIONS_POLICIES', label: '16. College Regulations & Policies' },
  { value: 'OFFICIAL_NOTICES', label: '17. Official Notices & Circulars' },
  { value: 'FREQUENTLY_ASKED_QUESTIONS', label: '18. Frequently Asked Student Questions' },
];

export const RecordEditorModal: React.FC<RecordEditorModalProps> = ({
  isOpen,
  onClose,
  recordToEdit,
  onSaveRecord,
  isLoading,
}) => {
  const [category, setCategory] = useState<InformationCategory>('COLLEGE_OVERVIEW');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [sourceOrganization, setSourceOrganization] = useState('V.S.B. Engineering College');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (recordToEdit) {
      setCategory(recordToEdit.category);
      setTitle(recordToEdit.title);
      setContent(recordToEdit.content);
      setSourceReference(recordToEdit.sourceReference || '');
      setSourceOrganization(recordToEdit.sourceOrganization || 'V.S.B. Engineering College');
      setVerificationNotes(recordToEdit.verificationNotes || '');
    } else {
      setCategory('COLLEGE_OVERVIEW');
      setTitle('');
      setContent('');
      setSourceReference('Campus Office Record');
      setSourceOrganization('V.S.B. Engineering College');
      setVerificationNotes('');
    }
    setValidationError(null);
  }, [recordToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (title.trim().length < 2) {
      setValidationError('Please enter a record title or subject.');
      return;
    }

    if (content.trim().length < 3) {
      setValidationError('Please enter factual content or details for this dataset entry.');
      return;
    }

    await onSaveRecord({
      category,
      title: title.trim(),
      content: content.trim(),
      sourceReference: sourceReference.trim() || 'Internal College Circular / Office Record',
      sourceUrl: null, // URLs completely removed
      sourceOrganization: sourceOrganization.trim() || 'V.S.B. Engineering College',
      verificationNotes: verificationNotes.trim() || 'Directly added to dataset.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-heading">
              {recordToEdit ? 'Edit Dataset Record' : 'Add New Dataset Record'}
            </h2>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Instantly saved & live in PING AI knowledge base</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {validationError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {validationError}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InformationCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Topic / Subject Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bus Route 14 Timings, B.E. Computer Science Intake, Hostel Mess Hours"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Factual Information / Dataset Details *
              </label>
              <textarea
                rows={6}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type or paste the official details here. PING uses this exact information when answering students and staff."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed font-sans"
              />
            </div>

            {/* Source Reference & Department (No URLs!) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Desk / Office Reference (Optional)
                </label>
                <input
                  type="text"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  placeholder="e.g. HOD Office, Notice Board, Transport Desk"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution / Organization
                </label>
                <input
                  type="text"
                  value={sourceOrganization}
                  onChange={(e) => setSourceOrganization(e.target.value)}
                  placeholder="V.S.B. Engineering College"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-slate-500">
              No review steps needed — entries are published directly.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-300 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Saving...' : 'Save to Dataset'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
