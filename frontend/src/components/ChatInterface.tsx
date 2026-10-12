import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Sparkles, Brain, Heart } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import Character, { useCharacter } from './Character';

interface ChatInterfaceProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onNavigateToWellness?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onToggleSidebar, sidebarOpen, onNavigateToWellness }) => {
  const { currentSession, sendMessage, isTyping, demoMode } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { expression, context, changeContext, getRandomExpression } = useCharacter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isTyping]);

  // Auto-expand textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Character reactions to app state
  useEffect(() => {
    if (isTyping) {
      changeContext('helping');
    } else if (currentSession?.messages.length === 0) {
      changeContext('greeting');
    }
  }, [isTyping, currentSession?.messages.length, changeContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const message = input.trim();
    setInput('');

    // Change character context based on interaction
    changeContext('helping');

    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  return (
    <div className="flex flex-col h-screen relative bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Clean Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 group"
            aria-label="Toggle sidebar"
          >
            <svg 
              className="w-4 h-4 text-slate-600 group-hover:text-slate-800 transition-colors" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800 tracking-tight">Zenith</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Mental Well-being Companion</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToWellness && (
            <button
              onClick={onNavigateToWellness}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm font-medium"
              title="Wellness Activities"
            >
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Wellness</span>
            </button>
          )}
          <Character
            expression={expression}
            context={context}
            size="small"
            showTooltip={true}
            onClick={getRandomExpression}
          />
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto px-6 pb-40 pt-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-4">
            {currentSession?.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-800 mb-3">
                  Welcome to your calm space
                </h2>
                <p className="text-slate-600 mb-8 max-w-md leading-relaxed">
                  I'm Zoe, your mental well-being companion. Share what's on your mind, and let's work together toward clarity and peace.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg w-full">
                  {[
                    { text: 'I need help with anxiety', icon: '🌿' },
                    { text: 'Morning routine ideas', icon: '🌅' },
                    { text: 'Overcome procrastination', icon: '🎯' },
                    { text: 'Better sleep habits', icon: '💤' }
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion.text)}
                      className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 text-left group"
                    >
                      <span className="text-xl">{suggestion.icon}</span>
                      <span className="text-sm text-slate-700 group-hover:text-slate-900">{suggestion.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 py-4">
                {currentSession?.messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isLast={index === currentSession.messages.length - 1}
                  />
                ))}
              </div>
            )}

            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Clean Input Area */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 p-4">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-violet-400 focus-within:bg-white transition-all duration-200">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share what's on your mind..."
              className="flex-1 resize-none bg-transparent border-none outline-none placeholder-slate-500 text-slate-800 min-h-[20px] max-h-[120px] leading-relaxed"
              rows={1}
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
        <p className="max-w-2xl mx-auto mt-2 text-center text-[11px] leading-snug text-slate-500">
          {demoMode && <span className="font-medium text-amber-600">Demo mode: backend not connected, replies are scripted. </span>}
          Zoe is an AI companion, not a therapist or emergency service. In a crisis, call your local emergency number or visit findahelpline.com.
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
