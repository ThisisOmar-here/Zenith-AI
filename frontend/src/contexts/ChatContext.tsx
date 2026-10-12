import React, { createContext, useContext, useState, useCallback } from 'react';
import { ChatReply, Source, demoReply, resetSession, sendChat } from '../utils/api';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
  mode?: ChatReply['mode'];
  sources?: Source[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  serverSessionId?: string;
}

interface ChatContextType {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  isTyping: boolean;
  demoMode: boolean;
  sendMessage: (content: string) => Promise<void>;
  createNewSession: () => void;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  clearAllSessions: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const generateId = () => Math.random().toString(36).slice(2, 11);

  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSession(newSession);
  }, []);

  const switchSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
    }
  }, [sessions]);

  const deleteSession = useCallback((sessionId: string) => {
    const target = sessions.find(s => s.id === sessionId);
    if (target?.serverSessionId) void resetSession(target.serverSessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      setCurrentSession(remainingSessions[0] || null);
    }
  }, [currentSession, sessions]);

  const clearAllSessions = useCallback(() => {
    setSessions([]);
    setCurrentSession(null);
  }, []);

  const getReply = async (content: string, serverSessionId?: string): Promise<ChatReply> => {
    try {
      const reply = await sendChat(content, serverSessionId);
      setDemoMode(false);
      return reply;
    } catch {
      // No backend reachable: answer from the labelled demo script instead of failing silently.
      setDemoMode(true);
      await new Promise(resolve => setTimeout(resolve, 700));
      return demoReply(content, serverSessionId);
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    const base: ChatSession = currentSession ?? {
      id: generateId(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (!currentSession) setSessions(prev => [base, ...prev]);

    const userMessage: Message = { id: generateId(), content, role: 'user', timestamp: new Date() };
    const updatedSession: ChatSession = {
      ...base,
      messages: [...base.messages, userMessage],
      updatedAt: new Date(),
      title: base.messages.length === 0 ? (content.length > 50 ? content.slice(0, 50) + '…' : content) : base.title,
    };

    setCurrentSession(updatedSession);
    setSessions(prev => prev.map(s => (s.id === updatedSession.id ? updatedSession : s)));
    setIsTyping(true);

    try {
      const reply = await getReply(content, base.serverSessionId);
      const assistantMessage: Message = {
        id: generateId(),
        content: reply.reply,
        role: 'assistant',
        timestamp: new Date(),
        mode: reply.mode,
        sources: reply.sources,
      };
      const finalSession: ChatSession = {
        ...updatedSession,
        serverSessionId: reply.session_id,
        messages: [...updatedSession.messages, assistantMessage],
        updatedAt: new Date(),
      };
      setCurrentSession(finalSession);
      setSessions(prev => prev.map(s => (s.id === finalSession.id ? finalSession : s)));
    } finally {
      setIsTyping(false);
    }
  }, [currentSession]);

  // Initialize with a default session if none exists
  React.useEffect(() => {
    if (sessions.length === 0 && !currentSession) {
      createNewSession();
    }
  }, [sessions.length, currentSession, createNewSession]);

  return (
    <ChatContext.Provider value={{
      currentSession,
      sessions,
      isTyping,
      demoMode,
      sendMessage,
      createNewSession,
      switchSession,
      deleteSession,
      clearAllSessions,
    }}>
      {children}
    </ChatContext.Provider>
  );
};
