import React from 'react';
import { Plus, MessageSquare, Trash2, User, Settings, X, Heart } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useUser } from '../contexts/UserContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToWellness?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigateToWellness }) => {
  const { sessions, currentSession, createNewSession, switchSession, deleteSession } = useChat();
  const { user, resetProfile } = useUser();

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return 'Today';
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    deleteSession(sessionId);
  };

  const getTruncatedTitle = (title: string) => {
    if (title.length > 40) {
      return title.substring(0, 40) + '...';
    }
    return title;
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-80 bg-slate-900 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Chat History</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => {
                createNewSession();
                onClose();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-700 text-white transition-all duration-200 group"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">New chat</span>
            </button>
            
            {/* Wellness Activities Button */}
            {onNavigateToWellness && (
              <button
                onClick={() => {
                  onNavigateToWellness();
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all duration-200 group"
              >
                <Heart className="w-4 h-4" />
                <span className="font-medium">Wellness Activities</span>
              </button>
            )}
          </div>

          {/* Chat Sessions */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    currentSession?.id === session.id
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  onClick={() => {
                    switchSession(session.id);
                    onClose();
                  }}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {getTruncatedTitle(session.title)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDate(session.updatedAt)} • {session.messages.length} messages
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-600 text-slate-400 hover:text-red-400 transition-all duration-200"
                    title="Delete chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {sessions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">No conversations yet</p>
                  <p className="text-slate-600 text-xs mt-1">Start a new chat to begin</p>
                </div>
              )}
            </div>
          </div>

          {/* User Profile Section */}
          {user && (
            <div className="border-t border-slate-700 p-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {user.lifeStage || 'Mental well-being journey'}
                  </p>
                </div>
                <button
                  onClick={resetProfile}
                  className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
