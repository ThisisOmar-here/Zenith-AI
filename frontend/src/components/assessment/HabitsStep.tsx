import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { AssessmentStepProps } from './AssessmentStep';

const HabitsStep: React.FC<AssessmentStepProps> = ({ profile, updateProfile }) => {
  const [currentWord, setCurrentWord] = useState('');

  const spiritualOptions = [
    { value: 'yes-regularly', label: 'Yes, regularly', description: 'I have a consistent spiritual practice', color: 'bg-green-500' },
    { value: 'sometimes', label: 'Sometimes', description: 'I practice spirituality occasionally', color: 'bg-yellow-500' },
    { value: 'rarely', label: 'Rarely', description: 'I rarely engage in spiritual practices', color: 'bg-orange-500' },
    { value: 'not-at-all', label: 'Not at all', description: 'I don\'t have spiritual practices', color: 'bg-gray-500' },
  ];

  const taskCompletionOptions = [
    { value: 'yes', label: 'Yes', emoji: '✅', description: 'I usually finish what I start' },
    { value: 'sometimes', label: 'Sometimes', emoji: '🤔', description: 'I complete tasks about half the time' },
    { value: 'no', label: 'No', emoji: '❌', description: 'I often struggle to complete tasks' },
  ];

  const addWord = () => {
    if (currentWord.trim() && (!profile.threeWords || profile.threeWords.length < 3)) {
      const newWords = [...(profile.threeWords || []), currentWord.trim()];
      updateProfile({ threeWords: newWords });
      setCurrentWord('');
    }
  };

  const removeWord = (index: number) => {
    if (profile.threeWords) {
      const newWords = profile.threeWords.filter((_, i) => i !== index);
      updateProfile({ threeWords: newWords });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addWord();
    }
  };

  return (
    <div className="space-y-8">
      {/* Spiritual Practice */}
      <div>
        <label className="block text-black font-medium text-gray-700 dark:text-gray-300 mb-4">
          Do you have any spiritual practice?
        </label>
        <div className="space-y-3">
          {spiritualOptions.map((option, index) => (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateProfile({ spiritualPractice: option.value as any })}
              className={`w-full p-4 rounded-xl border transition-all duration-200 text-left ${
                profile.spiritualPractice === option.value
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-700 dark:text-primary-300'
                  : 'bg-white/40 hover:bg-white/60 dark:bg-gray-800/40 dark:hover:bg-gray-800/60 border-black/20 dark:border-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-4 h-4 rounded-full ${option.color}`} />
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-black text-gray-500 dark:text-gray-400 mt-1">
                    {option.description}
                  </div>
                </div>
                {profile.spiritualPractice === option.value && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Task Completion */}
      <div>
        <label className="block text-black font-medium text-gray-700 dark:text-gray-300 mb-4">
          Do you usually complete tasks you set out to do?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {taskCompletionOptions.map((option, index) => (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateProfile({ taskCompletion: option.value as any })}
              className={`p-4 rounded-xl border transition-all duration-200 text-center ${
                profile.taskCompletion === option.value
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-700 dark:text-primary-300'
                  : 'bg-white/40 hover:bg-white/60 dark:bg-gray-800/40 dark:hover:bg-gray-800/60 border-black/20 dark:border-gray-700/50'
              }`}
            >
              <div className="text-3xl mb-2">{option.emoji}</div>
              <div className="font-medium mb-1">{option.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {option.description}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Three Words */}
      <div>
        <label className="block text-black font-medium text-gray-700 dark:text-gray-300 mb-3">
          Describe yourself in three words
        </label>
        <div className="space-y-4">
          {/* Word Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={currentWord}
              onChange={(e) => setCurrentWord(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter a word that describes you..."
              className="flex-1 px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              disabled={profile.threeWords && profile.threeWords.length >= 3}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={addWord}
              disabled={!currentWord.trim() || (profile.threeWords && profile.threeWords.length >= 3)}
              className="px-4 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-black rounded-xl transition-colors disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Word Chips */}
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {profile.threeWords?.map((word, index) => (
                <motion.div
                  key={`${word}-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full"
                >
                  <span className="font-medium">{word}</span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeWord(index)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    (profile.threeWords?.length || 0) > i
                      ? 'bg-primary-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-black text-gray-500 dark:text-gray-400">
              {profile.threeWords?.length || 0} of 3 words
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HabitsStep;
