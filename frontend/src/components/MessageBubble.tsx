import React from 'react';
import { User, Copy, Check, Brain, BookOpen, LifeBuoy } from 'lucide-react';
import { Message } from '../contexts/ChatContext';

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === 'user';
  const isCrisis = message.mode === 'crisis';
  const sources = Array.from(new Set((message.sources ?? []).map(s => s.source).filter(Boolean))) as string[];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} group`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
          <Brain className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <div
          className={`relative px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-br-md'
              : isCrisis
                ? 'bg-rose-50 border border-rose-200 text-slate-800 rounded-bl-md shadow-sm'
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm'
          }`}
        >
          {isCrisis && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 mb-2">
              <LifeBuoy className="w-3.5 h-3.5" /> Support resources
            </div>
          )}
          <p className="m-0 whitespace-pre-line leading-relaxed text-sm">
            {message.content}
          </p>
          {sources.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              {sources.map(name => (
                <span key={name} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                  {name}
                </span>
              ))}
            </div>
          )}
          
          <button
            onClick={handleCopy}
            className={`absolute -top-2 ${
              isUser ? '-left-2' : '-right-2'
            } opacity-0 group-hover:opacity-100 bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm hover:shadow-md transition-all duration-200`}
            aria-label="Copy message"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3 text-slate-600" />
            )}
          </button>
        </div>
        
        <div className="text-xs text-slate-500 mt-1 px-1">
          {formatTime(message.timestamp)}
          {message.mode === 'demo' && <span className="ml-2 text-amber-600">demo reply</span>}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-4 h-4 text-slate-600" />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
