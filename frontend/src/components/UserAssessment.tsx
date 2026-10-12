import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { UserProfile, useUser } from '../contexts/UserContext';
import { saveAssessmentData } from '../utils/assessmentStorage';
import AssessmentStep from './assessment/AssessmentStep';
import IdentityStep from './assessment/IdentityStep';
import LifestyleStep from './assessment/LifestyleStep';
import MentalStateStep from './assessment/MentalStateStep';
import ValuesStep from './assessment/ValuesStep';
import HabitsStep from './assessment/HabitsStep';

const UserAssessment: React.FC = () => {
  const { completeAssessment } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [isCompleting, setIsCompleting] = useState(false);

  const steps = [
    {
      title: "Identity & Background",
      description: "Tell us about yourself",
      component: IdentityStep,
    },
    {
      title: "Lifestyle & Environment",
      description: "Your daily life and surroundings",
      component: LifestyleStep,
    },
    {
      title: "Mental & Emotional State",
      description: "How you're feeling right now",
      component: MentalStateStep,
    },
    {
      title: "Values & Goals",
      description: "What matters most to you",
      component: ValuesStep,
    },
    {
      title: "Habits & Self-Reflection",
      description: "Your practices and self-awareness",
      component: HabitsStep,
    },
  ];

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);

    // Save assessment data to JSON
    saveAssessmentData(profile);

    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 2000));

    completeAssessment(profile as UserProfile);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Identity
        return profile.age && profile.lifeStage && profile.dailyRole;
      case 1: // Lifestyle
        return profile.livingSituation && profile.sleepHours && profile.exerciseFrequency;
      case 2: // Mental State
        return profile.generalMood && profile.biggestStressSource && profile.copingMechanism;
      case 3: // Values
        return profile.currentPriority && profile.skillToImprove;
      case 4: // Habits
        return profile.spiritualPractice && profile.taskCompletion && profile.threeWords;
      default:
        return false;
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  if (isCompleting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="text-center relative z-10">
          <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-8 h-8 text-black" />
          </div>
          <h2 className="text-3xl font-semibold bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 bg-clip-text text-transparent mb-5 tracking-tight">Preparing Your Space</h2>
          <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">We’re aligning your preferences and calibrating guidance layers…</p>
          <div className="mt-6">
            <div className="loading-dots">
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-5xl relative z-10">
        {/* Clean Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 mx-auto mb-8 rounded-[34px] bg-gradient-to-br from-indigo-400/30 via-violet-300/30 to-pink-300/30 flex items-center justify-center">
            <span className="text-5xl">🧠</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 bg-clip-text text-transparent mb-6">
            Calibrate Your Companion
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            A few gentle questions help Zenith adapt tone, pacing and focus to you. Just answer what feels easy — you can refine anything later.
          </p>
          <div className="relative max-w-xl mx-auto mb-6">
            <div className="h-3 rounded-full bg-white/50 backdrop-blur border border-white/60 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 transition-all duration-700"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
            <div className="mt-3 text-gray-500 text-sm font-medium tracking-wide">
              Step {currentStep + 1} / {steps.length}
            </div>
          </div>
        </div>

        {/* Clean Step Content */}
        <div className="zenith-surface zenith-float p-10 max-w-4xl mx-auto rounded-[42px]">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 bg-clip-text text-transparent mb-3 tracking-tight">
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-600 dark:text-gray-500 text-lg leading-relaxed">
              {steps[currentStep].description}
            </p>
          </div>
          <CurrentStepComponent profile={profile} updateProfile={updateProfile} />
        </div>

        {/* Enhanced Navigation */}
        <div className="flex justify-between items-center mt-10 max-w-4xl mx-auto">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="group relative px-8 py-4 rounded-2xl font-medium text-sm tracking-wide border border-white/70 bg-white/60 backdrop-blur shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-2 text-gray-700"><ChevronLeft className="w-5 h-5" /> Back</span>
          </button>
          <button
            onClick={handleNext}
            disabled={!isStepValid()}
            className="relative px-10 py-4 rounded-2xl font-semibold text-sm tracking-wide text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-2">{currentStep === steps.length - 1 ? 'Finish Alignment' : 'Continue'} <ChevronRight className="w-5 h-5" /></span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserAssessment;
