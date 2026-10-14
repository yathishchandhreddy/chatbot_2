import React from 'react';
import { X, GraduationCap, MapPin, CheckCircle, Clock, ExternalLink, ShieldCheck } from 'lucide-react';
import { PenguinMascot } from './PenguinMascot';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-labelledby="about-dialog-title"
      >
        {/* Header with Mascot */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-sky-50 to-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-xl bg-white shadow-xs border border-sky-100">
              <PenguinMascot size="sm" animated={false} interactive={false} />
            </div>
            <div>
              <h2 id="about-dialog-title" className="text-lg font-bold text-slate-900 font-heading">
                About PING
              </h2>
              <p className="text-xs text-sky-700 font-medium">
                V.S.B. Engineering College Campus Companion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-600 text-xs sm:text-sm leading-relaxed">
          {/* Mission */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 tracking-wider">
              CAMPUS COMPANION PURPOSE
            </h3>
            <p>
              PING is designed to be the friendly digital navigator for students, faculty, and visitors at 
              <strong className="text-slate-800"> V.S.B. Engineering College, Karur</strong>. From discovering departmental courses and laboratory facilities to checking admissions and calendar dates, PING makes college information fast and approachable.
            </p>
          </div>

          {/* VSB Institutional Details */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
              <GraduationCap className="w-4 h-4 text-sky-600 shrink-0" />
              <span>V.S.B. Engineering College</span>
            </div>
            <div className="flex items-start gap-2 text-[11px] text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>NH-67, Covai Road, Karur – 639 111, Tamil Nadu, India</span>
            </div>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Autonomous Institution · NAAC Accredited · Approved by AICTE</span>
            </div>
            <div className="pt-2">
              <a
                href="https://vsbec.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-medium hover:underline"
              >
                <span>Visit Official College Website (vsbec.com)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Development Roadmap */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 tracking-wider">
              DEVELOPMENT ROADMAP
            </h3>

            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-emerald-900">Phase 1 & 2 (Active): </span>
                  <span className="text-emerald-800">
                    Frontend UI design, animated Penguin Mascot, and real Google Gemini AI model connection via secure server-side proxy.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-100/70 border border-slate-200 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">Phase 3 (Upcoming): </span>
                  <span className="text-slate-600">
                    Official college database RAG verification, voice speech synthesis, and 3D mascot GLB model rendering.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            PING v2.0 (Gemini AI Connected)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
