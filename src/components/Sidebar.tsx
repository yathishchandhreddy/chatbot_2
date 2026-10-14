import React from 'react';
import {
  MessageSquarePlus,
  Home,
  Info,
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Trash2,
  X,
  ExternalLink,
  GraduationCap,
  Shield
} from 'lucide-react';
import { PenguinMascot } from './PenguinMascot';
import { ConversationHistoryItem } from '../types';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onNewChat: () => void;
  onGoHome: () => void;
  onOpenAbout: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  conversations: ConversationHistoryItem[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
  onNewChat,
  onGoHome,
  onOpenAbout,
  onOpenSettings,
  onOpenAdmin,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 md:static flex flex-col bg-slate-900 text-slate-100 border-r border-slate-800 transition-all duration-300 ease-in-out ${
          // Mobile visibility
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          // Desktop collapsed vs expanded width
          isCollapsed ? 'md:w-20' : 'w-72 md:w-72'
        }`}
      >
        {/* Header / Brand Zone */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
          <div
            onClick={onGoHome}
            className={`flex items-center gap-3 cursor-pointer group transition-colors ${
              isCollapsed ? 'justify-center w-full' : ''
            }`}
            title="PING - V.S.B. Campus Assistant"
          >
            <div className="relative shrink-0 flex items-center justify-center p-1 rounded-xl bg-slate-800/80 group-hover:bg-slate-800 border border-slate-700/60 shadow-xs">
              <PenguinMascot size="sm" animated={false} interactive={false} />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight text-white font-heading">
                    PING
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 rounded px-1.5 py-0.2">
                    PHASE 2
                  </span>
                </div>
                <span className="text-xs text-slate-400 truncate flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-sky-400 shrink-0" />
                  <span className="truncate">V.S.B. Engg College</span>
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action: New Chat */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-all shadow-sm active:scale-[0.98] ${
              isCollapsed ? 'px-0' : ''
            }`}
            title="Start New Chat"
          >
            <MessageSquarePlus className="w-4 h-4 shrink-0 text-slate-950" />
            {!isCollapsed && <span className="truncate">New Chat</span>}
          </button>
        </div>

        {/* Navigation Shortcuts */}
        <div className="px-3 py-1 space-y-1">
          <button
            onClick={() => {
              onGoHome();
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Campus Home"
          >
            <Home className="w-4 h-4 text-slate-400 shrink-0" />
            {!isCollapsed && <span>Campus Home</span>}
          </button>
        </div>

        {/* Middle Section: Recent Conversations */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 pt-2 pb-1 text-xs font-medium text-slate-400 tracking-wider">
              <span>RECENT CHATS</span>
              <span className="text-[11px] text-slate-500">{conversations.length}</span>
            </div>
          )}

          {conversations.length === 0 ? (
            !isCollapsed && (
              <div className="px-3 py-6 text-center text-xs text-slate-500">
                <p>No chat history yet.</p>
                <p className="mt-1 text-[11px] text-slate-600">Start asking PING questions!</p>
              </div>
            )
          ) : (
            <div className="space-y-1">
              {conversations.map((item) => {
                const isActive = activeConversationId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectConversation(item.id);
                      onCloseMobile();
                    }}
                    className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-sky-300 font-medium'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title={item.title}
                  >
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-sky-400' : 'text-slate-400'
                      }`}
                    />

                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1">{item.title}</span>
                        <button
                          onClick={(e) => onDeleteConversation(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 rounded transition-opacity"
                          title="Remove from history"
                          aria-label="Delete chat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Section: College Info, About, Settings & Collapse Toggle */}
        <div className="p-3 border-t border-slate-800/80 space-y-1 bg-slate-900/60">
          {/* About PING button */}
          <button
            onClick={() => {
              onOpenAbout();
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="About PING & VSB"
          >
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col text-left">
                <span className="font-medium text-slate-200">About PING</span>
                <span className="text-[10px] text-slate-400">Karur, Tamil Nadu</span>
              </div>
            )}
          </button>

          {/* Settings button */}
          <button
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4 text-slate-400 shrink-0" />
            {!isCollapsed && <span className="font-medium text-slate-200">Settings</span>}
          </button>

          {/* Admin Portal Entry Point */}
          <button
            onClick={() => {
              onOpenAdmin();
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-500/30 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Admin Portal (ID: admin@vsbec.edu.in | Pass: admin123)"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              {!isCollapsed && (
                <div className="flex flex-col text-left">
                  <span>Admin Portal</span>
                  <span className="text-[10px] text-amber-400/70 font-normal">ID: admin | Pass: admin123</span>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                LOGIN
              </span>
            )}
          </button>

          {/* Official VSB website external shortcut */}
          {!isCollapsed && (
            <a
              href="https://vsbec.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 text-[11px] text-slate-400 hover:text-sky-300 rounded-lg hover:bg-slate-800/40 transition-colors"
            >
              <span className="truncate">Official vsbec.com</span>
              <ExternalLink className="w-3 h-3 shrink-0 ml-1 opacity-70" />
            </a>
          )}

          {/* Desktop collapse rail button */}
          <div className="hidden md:block pt-1">
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Collapse Sidebar</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
