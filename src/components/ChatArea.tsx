import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  Menu,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  User,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Shield,
  Square
} from 'lucide-react';
import { PenguinMascot } from './PenguinMascot';
import { SuggestedQuestions } from './SuggestedQuestions';
import { ChatMessage, SettingsState } from '../types';

interface ChatAreaProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onRetry?: (text: string) => void;
  onNewChat: () => void;
  onToggleSidebarMobile: () => void;
  onOpenAbout: () => void;
  onOpenAdmin?: () => void;
  onCancelThinking?: () => void;
  settings: SettingsState;
  inputValue: string;
  setInputValue: (val: string) => void;
  isLoading?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onSendMessage,
  onRetry,
  onNewChat,
  onToggleSidebarMobile,
  onOpenAbout,
  onOpenAdmin,
  onCancelThinking,
  settings,
  inputValue,
  setInputValue,
  isLoading = false,
}) => {
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message or loading change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Adjust textarea height automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    // Play subtle synthesized audio tone if sound enabled
    if (settings.soundEnabled && typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch {
        // Safe fallback
      }
    }

    onSendMessage(trimmed);
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSelectSuggestedQuestion = (questionText: string) => {
    setInputValue(questionText);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
      }, 50);
    }
  };

  const handleMicClick = () => {
    setMicNotice('Voice input placeholder: Voice features will be supported in a future phase.');
    setTimeout(() => setMicNotice(null), 3000);
  };

  const isChatEmpty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-50/60 overflow-hidden relative">
      {/* Top Navbar */}
      <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebarMobile}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-xs shrink-0">
              <PenguinMascot size="sm" animated={false} interactive={false} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight font-heading">
                  PING
                </h1>
                <span className="text-[11px] font-medium text-slate-400">·</span>
                <span className="text-xs text-slate-600 font-medium hidden sm:inline">
                  V.S.B. Engineering College
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded px-1.5 py-0.5">
                  Gemini AI Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <span>Phase 2 Campus Assistant</span>
                <span className="text-slate-300">·</span>
                <span className="text-sky-700 font-medium">Karur, Tamil Nadu</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {!isChatEmpty && (
            <button
              onClick={onNewChat}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                isLoading
                  ? 'text-slate-400 bg-slate-100 cursor-not-allowed'
                  : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
              }`}
              title="Clear current conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          )}

          <button
            onClick={onOpenAbout}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="About PING & VSB"
            aria-label="About PING & VSB"
          >
            <Info className="w-4 h-4" />
          </button>

          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 rounded-lg transition-colors cursor-pointer"
              title="Open VSB Administrative Portal (Staff)"
            >
              <Shield className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Admin Portal</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Conversation Canvas */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:py-8 flex flex-col justify-start">
        {isChatEmpty ? (
          /* Large Empty Welcome State */
          <div className="my-auto flex flex-col items-center justify-center text-center max-w-2xl mx-auto w-full py-4 animate-in fade-in duration-300">
            {/* Mascot Area */}
            <div className="mb-4">
              <PenguinMascot
                size="lg"
                animated={settings.mascotAnimation}
                interactive={true}
              />
            </div>

            {/* Welcome Typography */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              Hey! I&apos;m PING 🐧
            </h2>

            <p className="text-sm sm:text-base font-semibold text-sky-700 mt-1">
              Your friendly campus companion.
            </p>

            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-lg leading-relaxed">
              I will help students and visitors find V.S.B. Engineering College information, explore academic topics, engineering subjects, study tips, and campus navigation.
            </p>

            {/* Suggested Question Cards */}
            <SuggestedQuestions onSelectQuestion={handleSelectSuggestedQuestion} />
          </div>
        ) : (
          /* Populated Conversation Stream */
          <div className="w-full max-w-3xl mx-auto space-y-6 pb-6">
            {/* Session Intro Header */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-2 border-b border-slate-200/60">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Conversation started today</span>
            </div>

            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isError = msg.isError;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 sm:gap-4 ${
                    isUser ? 'justify-end' : 'justify-start'
                  } animate-in fade-in slide-in-from-bottom-2 duration-200`}
                >
                  {/* PING Avatar for assistant messages */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-xs border border-slate-700/40 mt-1">
                      <PenguinMascot size="sm" animated={false} interactive={false} />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-xs ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-tr-xs'
                        : isError
                        ? 'bg-rose-50 border border-rose-200 text-rose-950 rounded-tl-xs'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs shadow-slate-100'
                    }`}
                  >
                    {/* Sender Label */}
                    <div className="flex items-center justify-between gap-3 mb-1.5 text-[11px] opacity-75">
                      <span className="font-semibold flex items-center gap-1">
                        {isUser ? (
                          <>
                            <User className="w-3 h-3" />
                            <span>You</span>
                          </>
                        ) : isError ? (
                          <>
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span className="text-rose-700 font-semibold">PING · Service Notice</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-sky-500" />
                            <span>PING Assistant</span>
                          </>
                        )}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums">
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Message Body */}
                    <div
                      className={`leading-relaxed whitespace-pre-wrap ${
                        settings.fontSize === 'large' ? 'text-base' : 'text-sm'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Retry Button if an error occurred */}
                    {isError && msg.canRetry && msg.retryText && onRetry && (
                      <div className="mt-3 pt-3 border-t border-rose-200/80 flex items-center justify-between">
                        <span className="text-[11px] text-rose-700">
                          Would you like to try sending again?
                        </span>
                        <button
                          onClick={() => onRetry(msg.retryText!)}
                          disabled={isLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading / Thinking Simulator Indicator */}
            {isLoading && (
              <div className="flex gap-3 sm:gap-4 justify-start animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-xs">
                  <PenguinMascot size="sm" animated={true} interactive={false} />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 flex items-center justify-between gap-3 text-xs text-slate-600 shadow-xs min-w-[200px]">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
                    <span className="font-medium text-slate-700">PING is answering...</span>
                  </div>
                  {onCancelThinking && (
                    <button
                      type="button"
                      onClick={onCancelThinking}
                      className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-slate-200/60"
                      title="Stop waiting"
                    >
                      <Square className="w-2.5 h-2.5 fill-current" />
                      <span>Stop</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Floating Notice for Microphone Visual Placeholder */}
      {micNotice && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in duration-150">
          <Info className="w-3.5 h-3.5 text-sky-400" />
          <span>{micNotice}</span>
        </div>
      )}

      {/* Bottom Message Input Box */}
      <footer className="p-4 md:p-6 bg-white/95 border-t border-slate-200/80 backdrop-blur-md shrink-0">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="relative flex items-end gap-2 bg-slate-50/90 rounded-2xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 p-2 shadow-xs transition-all"
          >
            {/* Visual Microphone Button Placeholder */}
            <button
              type="button"
              onClick={handleMicClick}
              className="p-2.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
              title="Voice input (Visual placeholder)"
              aria-label="Voice input"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Message Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask PING about VSB Engineering College or academics... (Enter to send)"
              className="flex-1 bg-transparent border-0 resize-none py-2 px-1 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden min-h-[40px] max-h-[160px] leading-relaxed"
            />

            {/* Send or Stop Button */}
            {isLoading ? (
              <button
                type="button"
                onClick={onCancelThinking}
                className="p-2.5 rounded-xl font-medium transition-all shrink-0 flex items-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 cursor-pointer active:scale-95 text-xs shadow-xs"
                title="Stop answering"
                aria-label="Stop answering"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span className="font-medium hidden sm:inline">Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className={`p-2.5 rounded-xl font-medium transition-all shrink-0 flex items-center justify-center ${
                  inputValue.trim()
                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs cursor-pointer active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Send message"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Quiet Informational Footer Caption */}
          <div className="flex items-center justify-between mt-2.5 px-2 text-[11px] text-slate-400 font-normal">
            <span className="truncate">
              V.S.B. Engineering College · Karur, Tamil Nadu
            </span>
            <span className="hidden sm:inline text-slate-400">
              Shift + Enter for new line · Powered by Gemini
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
