import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Users, UserCheck, Car } from 'lucide-react';
import { AssessmentStepProps } from './AssessmentStep';

const LifestyleStep: React.FC<AssessmentStepProps> = ({ profile, updateProfile }) => {
  const [showCarInput, setShowCarInput] = useState(profile.carOwnership?.hasCar || false);

  const livingSituationOptions = [
    { value: 'alone', label: 'Alone', icon: Home, description: 'Living independently' },
    { value: 'with-family', label: 'With Family', icon: Users, description: 'Living with family members' },
    { value: 'with-roommates', label: 'With Roommates', icon: UserCheck, description: 'Sharing space with friends/roommates' },
    { value: 'other', label: 'Other', icon: Home, description: 'Different living arrangement' },
  ];

  const sleepHoursOptions = [
    { value: '<5', label: 'Less than 5 hours', color: 'bg-red-500' },
    { value: '5-6', label: '5-6 hours', color: 'bg-orange-500' },
    { value: '7-8', label: '7-8 hours', color: 'bg-green-500' },
    { value: '9+', label: '9+ hours', color: 'bg-blue-500' },
  ];

  const exerciseOptions = [
    { value: 'rarely', label: 'Rarely', progress: 10 },
    { value: '1-2-times', label: '1-2 times a week', progress: 35 },
    { value: '3-5-times', label: '3-5 times a week', progress: 70 },
    { value: 'almost-daily', label: 'Almost daily', progress: 95 },
  ];

  const handleCarOwnership = (hasCar: boolean) => {
    setShowCarInput(hasCar);
    updateProfile({ 
      carOwnership: { 
        hasCar, 
        carType: hasCar ? profile.carOwnership?.carType || '' : undefined 
      } 
    });
  };

  return (
    <div className="space-y-8">
      {/* Living Situation */}
      <div>
        <label className="block text-black font-medium text-gray-700 dark:text-gray-300 mb-4">
          Living Situation
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {livingSituationOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <motion.button
                key={option.value}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => updateProfile({ livingSituation: option.value as any })}
                className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                  profile.livingSituation === option.value
                    ? 'bg-primary-500/20 border-primary-500/50 text-primary-700 dark:text-primary-300'
                    : 'bg-white/40 hover:bg-white/60 dark:bg-gray-800/40 dark:hover:bg-gray-800/60 border-black/20 dark:border-gray-700/50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <IconComponent className="w-6 h-6 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-black text-gray-500 dark:text-gray-400 mt-1">
                      {option.description}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Car Ownership */}
      <div>
        <label className="block text-black font-medium text-gray-700 dark:text-gray-300 mb-4">
          Car Ownership
        </label>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCarOwnership(true)}
              className={`flex-1 p-4 rounded-xl border transition-all duration-200 ${
                profile.carOwnership?.hasCar === true
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-700 dark:text-primary-300'
                  : 'bg-white/40 hover:bg-white/60 dark:bg-gray-800/40 dark:hover:bg-gray-800/60 border-black/20 dark:border-gray-700/50'
              }`}
            >
              <Car className="w-6 h-6 mx-auto mb-2" />
              <div className="font-medium">Yes, I have a car</div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCarOwnership(false)}
              className={`flex-1 p-4 rounded-xl border transition-all duration-200 ${
                profile.carOwnership?.hasCar === false
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-700 dark:text-primary-300'
                  : 'bg-white/40 hover:bg-white/60 dark:bg-gray-800/40 dark:hover:bg-gray-800/60 border-black/20 dark:border-gray-700/50'
              }`}
            >
              <div className="w-6 h-6 mx-auto mb-2 text-2xl">🚶</div>
              <div className="font-medium">No car</div>
            </motion.button>
          </div>

          {showCarInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <input
                type="text"
                placeholder="What type of car do you have?"
                value={profile.carOwnership?.carType || ''}
                onChange={(e) => updateProfile({ 
                  carOwnership: { 
                    hasCar: true, 
                    carType: e.target.value 
                  } 
                })}
                className="w-full px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Sleep Hours */}
      <div>
        <label className="block text-black font-medium text-gray-700 dark:text-gray-300 mb-4">
          Sleep Hours (per night)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {sleepHoursOptions.map((option, index) => (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateProfile({ sleepHours: option.value as any })}
              className={`p-3 rounded-xl border transition-all duration-200 text-center ${
                profile.sleepHours === option.value
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-700 dark:text-primary-300'
                  : 'bg-white/40 hover:bg-white/60 dark:bg-gray-800/40 dark:hover:bg-gray-800/60 border-black/20 dark:border-gray-700/50'
              }`}
            >
              <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${option.color}`} />
              <div className="text-black font-medium">{option.label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Exercise Frequency */}
      <div>
        <label className="block text-black font-medium text-gray-700 dark:text-gray-300 mb-4">
          Exercise Frequency
        </label>
        <div className="space-y-3">
          {exerciseOptions.map((option, index) => (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateProfile({ exerciseFrequency: option.value as any })}
              className={`w-full p-4 rounded-xl border transition-all duration-200 text-left ${
                profile.exerciseFrequency === option.value
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-700 dark:text-primary-300'
                  : 'bg-white/40 hover:bg-white/60 dark:bg-gray-800/40 dark:hover:bg-gray-800/60 border-black/20 dark:border-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{option.label}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${option.progress}%` }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                    />
                  </div>
                  <span className="text-black text-gray-500 dark:text-gray-400">
                    {option.progress}%
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LifestyleStep;
