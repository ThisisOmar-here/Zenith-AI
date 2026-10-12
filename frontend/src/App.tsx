import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';
import { UserProvider } from './contexts/UserContext';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import UserAssessment from './components/UserAssessment';
import WelcomeAnimation from './components/WelcomeAnimation';
import WellnessActivities from './components/WellnessActivities';
import { useUser } from './contexts/UserContext';

type AppView = 'chat' | 'wellness' | 'assessment' | 'welcome';

const AppContent: React.FC = () => {
  const { user, isFirstTime } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('chat');
  const [showWelcome, setShowWelcome] = useState(() => {
    // Show welcome animation for first-time users who haven't seen it
    return !localStorage.getItem('zenith-welcome-seen') && !user;
  });

  const handleWelcomeComplete = () => {
    localStorage.setItem('zenith-welcome-seen', 'true');
    setShowWelcome(false);
  };

  // Show welcome animation first
  if (showWelcome) {
    return <WelcomeAnimation onComplete={handleWelcomeComplete} />;
  }

  // Show assessment for first-time users
  if (isFirstTime) {
    return (
      <div className="relative z-10">
        <UserAssessment />
      </div>
    );
  }

  // Show wellness activities if selected
  if (currentView === 'wellness') {
    return <WellnessActivities onBack={() => setCurrentView('chat')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="relative z-10 flex h-screen">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          onNavigateToWellness={() => setCurrentView('wellness')}
        />
        <div className="flex-1 flex flex-col">
          <ChatInterface
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
            onNavigateToWellness={() => setCurrentView('wellness')}
          />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <UserProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </UserProvider>
    </ThemeProvider>
  );
};

export default App;
