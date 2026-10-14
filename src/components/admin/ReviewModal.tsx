import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, ExternalLink, ShieldAlert, Loader2 } from 'lucide-react';
import { CollegeSourceRecord } from '../../types/collegeSource';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CollegeSourceRecord | null;
  onApplyReview: (decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES', notes: string) => Promise<void>;
  isLoading: boolean;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  record,
  onApplyReview,
  isLoading,
}) => {
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'>('APPROVE');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (verificationNotes.trim().length < 5) {
      setErrorMessage('Please provide substantive verification notes (minimum 5 characters).');
      return;
    }

    try {
      await onApplyReview(decision, verificationNotes.trim());
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to submit review decision.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Authorized Source Verification Audit
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Record Overview */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{record.category}</span>
              <span className="font-mono">{record.id}</span>
            </div>

            <h3 className="text-sm font-bold text-slate-900">{record.title}</h3>

            <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
              {record.content}
            </p>

            {/* Source citation */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-200/60 mt-2">
              <div className="text-slate-600 flex items-center gap-2">
                <span>Source:</span>
                <strong className="text-slate-800">{record.sourceOrganization}</strong>
                {record.sourceReference && (
                  <span className="text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded text-[11px]">
                    {record.sourceReference}
                  </span>
                )}
              </div>
              {record.sourceUrl && (
                <a
                  href={record.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-semibold hover:underline text-[11px]"
                >
                  <span>Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-800 rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Review Decision Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Audit Decision *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDecision('APPROVE')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    decision === 'APPROVE'
                      ? 'border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${decision === 'APPROVE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Approve & Verify</div>
                    <div className="text-[10px] text-slate-500">Marks record as VERIFIED</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('REQUEST_CHANGES')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    decision === 'REQUEST_CHANGES'
                      ? 'border-amber-500 bg-amber-50/80 ring-1 ring-amber-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${decision === 'REQUEST_CHANGES' ? 'text-amber-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Request Changes</div>
                    <div className="text-[10px] text-slate-500">Sets status NEEDS_REVIEW</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('REJECT')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    decision === 'REJECT'
                      ? 'border-rose-500 bg-rose-50/80 ring-1 ring-rose-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <XCircle className={`w-4 h-4 mt-0.5 shrink-0 ${decision === 'REJECT' ? 'text-rose-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Reject</div>
                    <div className="text-[10px] text-slate-500">Archives record as REJECTED</div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reviewer Audit Commentary & Notes *
              </label>
              <textarea
                rows={3}
                required
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Specify how content was cross-checked against original document, verified page number, or reasons for rejection..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Submit Audit Decision</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
