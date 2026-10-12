import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  // Identity & Background
  age?: number;
  lifeStage?: 'student' | 'early-career' | 'established-career' | 'retired' | 'other';
  dailyRole?: string;
  
  // Lifestyle & Environment
  livingSituation?: 'alone' | 'with-family' | 'with-roommates' | 'other';
  carOwnership?: { hasCar: boolean; carType?: string };
  sleepHours?: '<5' | '5-6' | '7-8' | '9+';
  exerciseFrequency?: 'rarely' | '1-2-times' | '3-5-times' | 'almost-daily';
  
  // Mental & Emotional State
  generalMood?: 'calm' | 'anxious' | 'sad' | 'motivated' | 'neutral';
  biggestStressSource?: string;
  copingMechanism?: 'social-media' | 'talking' | 'food-drink' | 'exercise' | 'other';
  
  // Values & Goals
  currentPriority?: 'health' | 'relationships' | 'career-studies' | 'money' | 'personal-growth';
  skillToImprove?: string;
  
  // Habits & Self-Reflection
  spiritualPractice?: 'yes-regularly' | 'sometimes' | 'rarely' | 'not-at-all';
  taskCompletion?: 'yes' | 'sometimes' | 'no';
  threeWords?: string[];
  
  // Metadata
  completedAt?: Date;
  name?: string;
}

interface UserContextType {
  user: UserProfile | null;
  isFirstTime: boolean;
  updateProfile: (profile: Partial<UserProfile>) => void;
  completeAssessment: (profile: UserProfile) => void;
  resetProfile: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('zenith-user-profile');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsFirstTime(false);
      } catch (error) {
        console.error('Error parsing stored user profile:', error);
        localStorage.removeItem('zenith-user-profile');
      }
    }
  }, []);

  const updateProfile = (profile: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...profile }));
  };

  const completeAssessment = (profile: UserProfile) => {
    const completedProfile = {
      ...profile,
      completedAt: new Date(),
    };
    setUser(completedProfile);
    setIsFirstTime(false);
    localStorage.setItem('zenith-user-profile', JSON.stringify(completedProfile));
  };

  const resetProfile = () => {
    setUser(null);
    setIsFirstTime(true);
    localStorage.removeItem('zenith-user-profile');
  };

  return (
    <UserContext.Provider value={{
      user,
      isFirstTime,
      updateProfile,
      completeAssessment,
      resetProfile,
    }}>
      {children}
    </UserContext.Provider>
  );
};
