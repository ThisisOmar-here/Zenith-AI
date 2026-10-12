import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Users, Briefcase, DollarSign, TrendingUp } from 'lucide-react';
import { AssessmentStepProps } from './AssessmentStep';

const ValuesStep: React.FC<AssessmentStepProps> = ({ profile, updateProfile }) => {
  const [skillSuggestions] = useState([
    'Communication', 'Leadership', 'Time Management', 'Public Speaking', 'Coding',
    'Writing', 'Design', 'Marketing', 'Finance', 'Cooking', 'Languages', 'Music'
  ]);

  const priorityOptions = [
    { 
      value: 'health', 
      label: 'Health', 
      icon: Heart, 
      color: 'bg-red-500',
      description: 'Physical and mental wellbeing'
    },
    { 
      value: 'relationships', 
      label: 'Relationships', 
      icon: Users, 
      color: 'bg-pink-500',
      description: 'Family, friends, and connections'
    },
    { 
      value: 'career-studies', 
      label: 'Career / Studies', 
      icon: Briefcase, 
      color: 'bg-blue-500',
      description: 'Professional growth and education'
    },
    { 
      value: 'money', 
      label: 'Money', 
      icon: DollarSign, 
      color: 'bg-green-500',
      description: 'Financial security and freedom'
    },
    { 
      value: 'personal-growth', 
      label: 'Personal Growth', 
      icon: TrendingUp, 
      color: 'bg-purple-500',
      description: 'Self-improvement and learning'
    },
  ];

  const handleSkillSuggestion = (skill: string) => {
    updateProfile({ skillToImprove: skill });
  };

  return (
    <div className="space-y-8">
      {/* Current Priority */}
      <div>
        <label className="block text-black font-medium text-gray-700 dark:text-gray-300 mb-4">
          What's your current priority in life?
        </label>
        <div className="space-y-3">
          {priorityOptions.map((priority, index) => {
            const IconComponent = priority.icon;
            return (
              <motion.button
                key={priority.value}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => updateProfile({ currentPriority: priority.value as any })}
                className={`w-full p-4 rounded-xl border transition-all duration-200 text-left ${
                  profile.currentPriority === priority.value
                    ? 'bg-primary-500/20 border-primary-500/50 text-primary-700 dark:text-primary-300'
                    : 'bg-white/40 hover:bg-white/60 dark:bg-gray-800/40 dark:hover:bg-gray-800/60 border-black/20 dark:border-gray-700/50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl ${priority.color} text-black`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-lg">{priority.label}</div>
                    <div className="text-black text-gray-500 dark:text-gray-400 mt-1">
                      {priority.description}
                    </div>
                  </div>
                  {profile.currentPriority === priority.value && (
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
            );
          })}
        </div>
      </div>

      {/* Skill to Improve */}
      <div>
        <label className="block text-black font-medium text-gray-700 dark:text-gray-300 mb-3">
          What skill would you most like to improve?
        </label>
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={profile.skillToImprove || ''}
              onChange={(e) => updateProfile({ skillToImprove: e.target.value })}
              placeholder="Type a skill you'd like to develop..."
              className="w-full px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          {/* Skill Suggestions */}
          <div>
            <p className="text-black text-gray-500 dark:text-gray-400 mb-3">
              Popular suggestions:
            </p>
            <div className="flex flex-wrap gap-2">
              {skillSuggestions.map((skill, index) => (
                <motion.button
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSkillSuggestion(skill)}
                  className={`px-3 py-2 text-black rounded-lg transition-all duration-200 ${
                    profile.skillToImprove === skill
                      ? 'bg-primary-500 text-black'
                      : 'bg-white/40 hover:bg-white/60 dark:bg-gray-800/40 dark:hover:bg-gray-800/60 border border-black/20 dark:border-gray-700/50'
                  }`}
                >
                  {skill}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValuesStep;
