import React from 'react';
import { Building2, BookOpen, PhoneCall, Calendar, ArrowUpRight } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void;
}

export const SUGGESTED_QUESTIONS = [
  {
    id: 'about-vsb',
    question: 'Tell me about VSB Engineering College',
    tag: 'Overview & History',
    icon: Building2,
    accentBg: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'departments',
    question: 'What departments are available?',
    tag: 'Academic Programs',
    icon: BookOpen,
    accentBg: 'bg-sky-50 text-sky-600',
  },
  {
    id: 'contact',
    question: 'How can I contact the college?',
    tag: 'Campus & Admissions',
    icon: PhoneCall,
    accentBg: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 'calendar',
    question: 'Where can I find the academic calendar?',
    tag: 'Schedules & Exams',
    icon: Calendar,
    accentBg: 'bg-indigo-50 text-indigo-600',
  },
];

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onSelectQuestion }) => {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 mt-6">
      <div className="flex items-center justify-between mb-3 px-1 text-xs text-slate-500 font-medium">
        <span>Suggested questions to get started</span>
        <span className="hidden sm:inline text-[11px] text-slate-400">Click to fill input</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {SUGGESTED_QUESTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectQuestion(item.question)}
              className="group text-left p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-sky-300 hover:shadow-md hover:shadow-sky-50/50 transition-all duration-200 flex items-start gap-3 active:scale-[0.99] cursor-pointer"
            >
              <div className={`p-2 rounded-lg ${item.accentBg} shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 group-hover:text-sky-700 transition-colors line-clamp-2 leading-relaxed">
                  {item.question}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 font-normal">
                  <span>{item.tag}</span>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-500 shrink-0 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
