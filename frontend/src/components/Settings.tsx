import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Palette, 
  Download, 
  Shield, 
  HelpCircle,
  ChevronRight,
  Lock,
  Info
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { user } = useUser();
  const [activeSection, setActiveSection] = useState<string>('profile');
  
  // Check if user has completed assessment
  const hasCompletedAssessment = user && Object.keys(user).length > 0;

  const settingSections = [
    {
      id: 'profile',
      title: 'Profile & Assessment',
      icon: User,
      description: 'Manage your profile and assessment data'
    },
    {
      id: 'character',
      title: 'Character Behavior',
      icon: Palette,
      description: 'Customize your AI companion'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      description: 'Manage alerts and reminders'
    },
    {
      id: 'data',
      title: 'Data & Privacy',
      icon: Shield,
      description: 'Export data and privacy settings'
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: HelpCircle,
      description: 'Get help and contact support'
    }
  ];

  const handleExportData = () => {
    const userData = {
      profile: user,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenith-ai-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">About Your Assessment</h3>
            <p className="text-sm text-blue-800">
              These questions help the app understand you better and provide personalized recommendations. 
              Your responses are used to tailor the AI's behavior and suggestions to your specific needs.
            </p>
          </div>
        </div>
      </div>

      {hasCompletedAssessment ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Assessment Completed</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            You have already completed your initial assessment. This helps maintain consistency in your AI companion's understanding of your preferences and needs.
          </p>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Your Profile Summary:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium">{user?.name || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-gray-500">Age:</span>
                <span className="ml-2 font-medium">{user?.age || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-gray-500">Completed:</span>
                <span className="ml-2 font-medium">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Assessment Not Completed</h3>
              <p className="text-sm text-yellow-800">
                Complete your initial assessment to unlock personalized features and recommendations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCharacterSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Character Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-700">Animation Frequency</label>
              <p className="text-sm text-gray-500">How often the character moves around</p>
            </div>
            <select className="input-enhanced text-sm">
              <option>Normal</option>
              <option>Frequent</option>
              <option>Minimal</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-700">Speech Bubbles</label>
              <p className="text-sm text-gray-500">Show character messages when clicked</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Notification Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-700">Daily Reminders</label>
              <p className="text-sm text-gray-500">Get daily check-in reminders</p>
            </div>
            <input type="checkbox" className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-700">Goal Updates</label>
              <p className="text-sm text-gray-500">Notifications about goal progress</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Data Management</h3>
        <div className="space-y-4">
          <button
            onClick={handleExportData}
            className="btn-secondary flex items-center gap-2 w-full justify-center"
          >
            <Download className="w-4 h-4" />
            Export My Data
          </button>
          <p className="text-sm text-gray-500">
            Download all your data including assessment responses, chat history, and preferences.
          </p>
        </div>
      </div>
    </div>
  );

  const renderHelpSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Help & Support</h3>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p className="mb-2"><strong>Version:</strong> 1.0.0</p>
            <p className="mb-2"><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Support:</strong> For help, contact our support team or check the documentation.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'character':
        return renderCharacterSection();
      case 'notifications':
        return renderNotificationsSection();
      case 'data':
        return renderDataSection();
      case 'help':
        return renderHelpSection();
      default:
        return renderProfileSection();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div className="w-1/3 bg-gray-50 border-r border-gray-200 p-4">
            <nav className="space-y-2">
              {settingSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <section.icon className="w-5 h-5" />
                    <div className="flex-1">
                      <div className="font-medium">{section.title}</div>
                      <div className="text-xs text-gray-500">{section.description}</div>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {renderActiveSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
