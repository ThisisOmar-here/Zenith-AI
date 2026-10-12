import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { AssessmentStepProps } from './AssessmentStep';

const IdentityStep: React.FC<AssessmentStepProps> = ({ profile, updateProfile }) => {
  const lifeStageOptions = [
    { value: 'student', label: 'Student', icon: '🎓' },
    { value: 'early-career', label: 'Early Career', icon: '🚀' },
    { value: 'established-career', label: 'Established Career', icon: '💼' },
    { value: 'retired', label: 'Retired', icon: '🌅' },
    { value: 'other', label: 'Other', icon: '✨' },
  ];

  const dailyRoleOptions = [
    'Student', 'Professional', 'Parent', 'Freelancer', 'Unemployed', 'Entrepreneur', 
    'Artist', 'Teacher', 'Healthcare Worker', 'Engineer', 'Other'
  ];

  const handleAgeChange = (increment: boolean) => {
    const currentAge = profile.age || 25;
    const newAge = increment ? currentAge + 1 : Math.max(13, currentAge - 1);
    updateProfile({ age: newAge });
  };

  return (
    <div className="space-y-8">
      {/* Age Input */}
      <div>
        <label className="block font-medium text-gray-700 dark:text-gray-300 mb-3">
          Age
        </label>
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => handleAgeChange(false)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="text-3xl font-semibold text-blue-600 dark:text-blue-400 min-w-[80px] text-center">
            {profile.age || 25}
          </div>

          <button
            onClick={() => handleAgeChange(true)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Life Stage */}
      <div>
        <label className="block font-medium text-gray-700 dark:text-gray-300 mb-3">
          Life Stage
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {lifeStageOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateProfile({ lifeStage: option.value as any })}
              className={`p-4 rounded-lg border transition-colors text-left ${
                profile.lifeStage === option.value
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{option.icon}</span>
                <span className="font-medium">{option.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Daily Role */}
      <div>
        <label className="block font-medium text-gray-700 dark:text-gray-300 mb-3">
          Daily Role
        </label>
        <div className="relative">
          <select
            value={profile.dailyRole || ''}
            onChange={(e) => updateProfile({ dailyRole: e.target.value })}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none cursor-pointer"
          >
            <option value="">Select your daily role...</option>
            {dailyRoleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentityStep;
