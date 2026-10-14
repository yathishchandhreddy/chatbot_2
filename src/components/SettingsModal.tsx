import React from 'react';
import { X, Volume2, Sparkles, Type, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';
import { SettingsState } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsState;
  onUpdateSettings: (newSettings: Partial<SettingsState>) => void;
  onClearAllHistory: () => void;
  historyCount: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearAllHistory,
  historyCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-labelledby="settings-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-600" />
            <h2 id="settings-dialog-title" className="text-base font-bold text-slate-800">
              Preferences & Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Phase 2 Status Banner */}
          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-100 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 leading-relaxed">
              <span className="font-semibold">Phase 2 Active:</span> Real Google Gemini AI engine is connected via secure server-side endpoints. Conversations are generated with academic and campus guidance.
            </div>
          </div>

          {/* Toggle: Mascot Animations */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>Penguin Mascot Animations</span>
              </div>
              <p className="text-xs text-slate-500">
                Enable gentle blinking, floating, and greeting waves
              </p>
            </div>
            <button
              role="switch"
              aria-checked={settings.mascotAnimation}
              onClick={() => onUpdateSettings({ mascotAnimation: !settings.mascotAnimation })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.mascotAnimation ? 'bg-sky-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.mascotAnimation ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle: Sound Effects Feedback */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Volume2 className="w-4 h-4 text-sky-600" />
                <span>Sound Feedback</span>
              </div>
              <p className="text-xs text-slate-500">
                Play subtle audio chime on message send
              </p>
            </div>
            <button
              role="switch"
              aria-checked={settings.soundEnabled}
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.soundEnabled ? 'bg-sky-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Font Scale Control */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Type className="w-4 h-4 text-sky-600" />
              <span>Chat Text Size</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ fontSize: 'normal' })}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all ${
                  settings.fontSize === 'normal'
                    ? 'border-sky-600 bg-sky-50 text-sky-900 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Standard (14px)
              </button>
              <button
                onClick={() => onUpdateSettings({ fontSize: 'large' })}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all ${
                  settings.fontSize === 'large'
                    ? 'border-sky-600 bg-sky-50 text-sky-900 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Comfortable (16px)
              </button>
            </div>
          </div>

          {/* Chat History Management */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              <span>Saved chats in session: </span>
              <span className="font-semibold text-slate-700">{historyCount}</span>
            </div>
            {historyCount > 0 && (
              <button
                onClick={onClearAllHistory}
                className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium rounded-lg transition-colors"
              >
                Clear History
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
