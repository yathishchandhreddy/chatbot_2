import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { AboutModal } from './components/AboutModal';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ChatMessage, ConversationHistoryItem, SettingsState } from './types';
import { AdminUserProfile } from './types/collegeSource';
import {
  isQuickGreeting,
  generateGreetingReply,
  searchCampusRecords,
  formatCampusAnswer,
} from './services/campusKnowledgeEngine';

// Initial sample conversation items for realistic campus assistant testing
const INITIAL_CONVERSATIONS: ConversationHistoryItem[] = [
  {
    id: 'conv-1',
    title: 'VSB College Overview & History',
    date: 'Today',
    preview: 'Tell me about VSB Engineering College',
  },
  {
    id: 'conv-2',
    title: 'Engineering Departments at VSB',
    date: 'Yesterday',
    preview: 'What departments are available?',
  },
];

export default function App() {
  // Application view state: 'chat' | 'admin'
  const [currentView, setCurrentView] = useState<'chat' | 'admin'>('chat');
  const [adminProfile, setAdminProfile] = useState<AdminUserProfile | null>(null);

  // Navigation & Drawer states
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);
  const [isSidebarCollapsedDesktop, setIsSidebarCollapsedDesktop] = useState<boolean>(false);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [conversations, setConversations] = useState<ConversationHistoryItem[]>(INITIAL_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Settings preferences
  const [settings, setSettings] = useState<SettingsState>({
    soundEnabled: true,
    mascotAnimation: true,
    fontSize: 'normal',
    compactMode: false,
  });

  // Check and restore admin session from sessionStorage on mount
  useEffect(() => {
    const savedToken = sessionStorage.getItem('vsb_admin_token');
    const savedProfileStr = sessionStorage.getItem('vsb_admin_profile');

    if (savedToken && savedProfileStr) {
      try {
        const parsedProfile = JSON.parse(savedProfileStr) as AdminUserProfile;
        // Verify token with backend
        fetch('/api/admin/auth/status', {
          headers: { Authorization: `Bearer ${savedToken}` },
        })
          .then((res) => {
            if (res.ok) {
              setAdminProfile(parsedProfile);
            } else {
              sessionStorage.removeItem('vsb_admin_token');
              sessionStorage.removeItem('vsb_admin_profile');
              setAdminProfile(null);
            }
          })
          .catch(() => {
            // Network fallback
            setAdminProfile(parsedProfile);
          });
      } catch {
        sessionStorage.removeItem('vsb_admin_token');
        sessionStorage.removeItem('vsb_admin_profile');
      }
    }
  }, []);

  // Admin Logout Handler
  const handleAdminLogout = async () => {
    if (adminProfile) {
      try {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminProfile.sessionToken}` },
        });
      } catch {
        // Safe fallback
      }
    }
    sessionStorage.removeItem('vsb_admin_token');
    sessionStorage.removeItem('vsb_admin_profile');
    setAdminProfile(null);
    setCurrentView('chat');
  };

  // New Chat handler: Clears active messages and resets state
  const handleNewChat = () => {
    if (isLoading) return;
    setMessages([]);
    setInputValue('');
    setActiveConversationId(null);
  };

  // Home handler: Clears to welcome view
  const handleGoHome = () => {
    handleNewChat();
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  // Stop / Cancel thinking manually
  const handleCancelThinking = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  // User sends a message or retries a query
  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Create and append user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: timeString,
      status: 'sent',
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    // 2. Update or create recent conversation record
    const convTitle = trimmed.length > 28 ? `${trimmed.substring(0, 28)}...` : trimmed;
    if (!activeConversationId) {
      const newConvId = `conv-${Date.now()}`;
      setActiveConversationId(newConvId);
      setConversations((prev) => [
        {
          id: newConvId,
          title: convTitle,
          date: 'Just now',
          preview: trimmed,
        },
        ...prev,
      ]);
    }

    // 3. Prepare conversation history for context
    const historyPayload = messages
      .filter((m) => !m.isError && m.text.trim().length > 0)
      .map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text,
      }));

    // Abort any existing pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    // Watchdog timer: cancel if network/server stalls beyond 6 seconds
    const watchdogTimer = setTimeout(() => {
      if (abortControllerRef.current === controller) {
        controller.abort();
      }
    }, 6000);

    let finalReply: string | null = null;

    try {
      // 4. Call server-side / Vercel API proxy route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      // Only attempt JSON parsing if server actually returned JSON!
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (data?.reply && typeof data.reply === 'string' && data.reply.trim().length > 0) {
          finalReply = data.reply;
        }
      } else {
        console.warn(`Server responded with ${response.status} (${contentType}), using local campus knowledge engine fallback.`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error?.name === 'AbortError') {
        // Request was canceled manually by user: provide helpful fallback
        const helpfulFallback: ChatMessage = {
          id: `ping-fallback-${Date.now()}`,
          sender: 'ping',
          text: `Hello from PING! 🐧 I'm here to help with your questions about V.S.B. Engineering College! You can ask about our autonomous curriculum, hostel facilities, college bus routes, or training and placements for instant answers.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'received',
        };
        setMessages((current) => [...current, helpfulFallback]);
        clearTimeout(watchdogTimer);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsLoading(false);
        return;
      }
      console.warn('Network or proxy unavailable, switching to local dataset engine:', error);
    }

    // 5. Intelligent campus knowledge engine fallback (ensures Vercel and offline deployments always work!)
    if (!finalReply) {
      if (isQuickGreeting(trimmed)) {
        finalReply = generateGreetingReply();
      } else {
        const matches = searchCampusRecords(trimmed);
        if (matches.length > 0) {
          finalReply = formatCampusAnswer(trimmed, matches);
        } else {
          finalReply = `Hello! I am PING, your V.S.B. campus companion! 🐧 I'm here to help with your questions about V.S.B. Engineering College. You can ask about departments, admissions, fees, hostel facilities, bus routes, leadership, or placements!`;
        }
      }
    }

    // 6. Append response message safely
    const replyMessage: ChatMessage = {
      id: `ping-${Date.now()}`,
      sender: 'ping',
      text: finalReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'received',
    };

    setMessages((current) => [...current, replyMessage]);

    // Cleanup timers and loading state
    clearTimeout(watchdogTimer);
    if (abortControllerRef.current === controller) {
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  // Retry failed prompt
  const handleRetry = (textToRetry: string) => {
    setMessages((prev) => prev.filter((m) => !m.isError || m.retryText !== textToRetry));
    handleSendMessage(textToRetry);
  };

  // Load conversation from history
  const handleSelectConversation = (id: string) => {
    if (isLoading) return;
    const found = conversations.find((c) => c.id === id);
    if (!found) return;

    setActiveConversationId(id);
    const sampleTime = '10:30 AM';
    setMessages([
      {
        id: `user-saved-${id}`,
        sender: 'user',
        text: found.preview,
        timestamp: sampleTime,
        status: 'sent',
      },
      {
        id: `ping-saved-${id}`,
        sender: 'ping',
        text: `Hello! I remember our discussion about "${found.preview}". How can I help you explore this further today?`,
        timestamp: sampleTime,
        status: 'received',
      },
    ]);
  };

  // Delete conversation from history
  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      handleNewChat();
    }
  };

  const handleClearAllHistory = () => {
    setConversations([]);
    handleNewChat();
  };

  const handleUpdateSettings = (newSettings: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // ----------------------------------------------------------------------------
  // ADMIN PORTAL VIEWS
  // ----------------------------------------------------------------------------
  if (currentView === 'admin') {
    if (!adminProfile) {
      return (
        <AdminLogin
          onLoginSuccess={(profile) => setAdminProfile(profile)}
          onBackToChat={() => setCurrentView('chat')}
        />
      );
    }

    return (
      <AdminDashboard
        adminProfile={adminProfile}
        onLogout={handleAdminLogout}
        onBackToChat={() => setCurrentView('chat')}
      />
    );
  }

  // ----------------------------------------------------------------------------
  // STUDENT ASSISTANT CHAT VIEW (PRESERVED 100%)
  // ----------------------------------------------------------------------------
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Responsive Collapsible Sidebar */}
      <Sidebar
        isOpen={isSidebarOpenMobile}
        isCollapsed={isSidebarCollapsedDesktop}
        onToggleCollapse={() => setIsSidebarCollapsedDesktop((prev) => !prev)}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        onNewChat={handleNewChat}
        onGoHome={handleGoHome}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAdmin={() => setCurrentView('admin')}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main Conversation & Assistant Canvas */}
      <ChatArea
        messages={messages}
        onSendMessage={handleSendMessage}
        onRetry={handleRetry}
        onNewChat={handleNewChat}
        onToggleSidebarMobile={() => setIsSidebarOpenMobile(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenAdmin={() => setCurrentView('admin')}
        onCancelThinking={handleCancelThinking}
        settings={settings}
        inputValue={inputValue}
        setInputValue={setInputValue}
        isLoading={isLoading}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onClearAllHistory={handleClearAllHistory}
        historyCount={conversations.length}
      />

      {/* About College & Companion Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
}
