import React from 'react';
import { Smile, Frown, Meh, Zap, Heart } from 'lucide-react';
import { AssessmentStepProps } from './AssessmentStep';

const MentalStateStep: React.FC<AssessmentStepProps> = ({ profile, updateProfile }) => {
  const moodOptions = [
    { value: 'calm', label: 'Calm', emoji: '😌', color: 'bg-blue-500', description: 'Feeling peaceful and relaxed' },
    { value: 'anxious', label: 'Anxious', emoji: '😰', color: 'bg-yellow-500', description: 'Feeling worried or nervous' },
    { value: 'sad', label: 'Sad', emoji: '😢', color: 'bg-gray-500', description: 'Feeling down or melancholy' },
    { value: 'motivated', label: 'Motivated', emoji: '🚀', color: 'bg-green-500', description: 'Feeling energized and driven' },
    { value: 'neutral', label: 'Neutral', emoji: '😐', color: 'bg-gray-400', description: 'Feeling balanced and steady' },
  ];

  const copingOptions = [
    { value: 'social-media', label: 'Social Media / Phone', icon: '📱' },
    { value: 'talking', label: 'Talking to Someone', icon: '💬' },
    { value: 'food-drink', label: 'Food / Drink', icon: '🍕' },
    { value: 'exercise', label: 'Exercise', icon: '🏃' },
    { value: 'other', label: 'Other', icon: '✨' },
  ];

  return (
    <div className="space-y-8">
      {/* General Mood */}
      <div>
        <label className="block font-medium text-gray-700 dark:text-gray-300 mb-4">
          How would you describe your general mood lately?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {moodOptions.map((mood) => (
            <button
              key={mood.value}
              onClick={() => updateProfile({ generalMood: mood.value as any })}
              className={`p-4 rounded-lg border transition-colors text-center ${
                profile.generalMood === mood.value
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="text-2xl mb-2">{mood.emoji}</div>
              <div className="font-medium mb-1">{mood.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {mood.description}
              </div>
              <div className={`w-full h-1 rounded-full mt-3 ${mood.color}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Biggest Stress Source */}
      <div>
        <label className="block text-black font-medium text-gray-700 dark:text-gray-300 mb-3">
          What's your biggest source of stress right now?
        </label>
        <div className="relative">
          <textarea
            value={profile.biggestStressSource || ''}
            onChange={(e) => updateProfile({ biggestStressSource: e.target.value })}
            placeholder="Share what's been weighing on your mind lately..."
            className="w-full px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none h-24"
            maxLength={500}
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {(profile.biggestStressSource || '').length}/500
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          This helps me understand what you're going through and provide better support.
        </p>
      </div>

      {/* Coping Mechanism */}
      <div>
        <label className="block font-medium text-gray-700 dark:text-gray-300 mb-4">
          When you're stressed, what do you usually turn to?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {copingOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateProfile({ copingMechanism: option.value as any })}
              className={`p-4 rounded-lg border transition-colors text-center ${
                profile.copingMechanism === option.value
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="text-xl mb-2">{option.icon}</div>
              <div className="font-medium">{option.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MentalStateStep;
