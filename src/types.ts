export interface ChatMessage {
  id: string;
  sender: 'user' | 'ping' | 'system';
  text: string;
  timestamp: string;
  status?: 'sent' | 'received' | 'error';
  isPhase1Notice?: boolean;
  isError?: boolean;
  canRetry?: boolean;
  retryText?: string;
}

export interface ConversationHistoryItem {
  id: string;
  title: string;
  date: string;
  preview: string;
}

export interface SuggestedQuestion {
  id: string;
  question: string;
  category: string;
  icon: string;
}

export interface SettingsState {
  soundEnabled: boolean;
  mascotAnimation: boolean;
  fontSize: 'normal' | 'large';
  compactMode: boolean;
}
