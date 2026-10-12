import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface MeditationTimerProps {
  onBack: () => void;
}

type MeditationType = 'mindfulness' | 'breathing' | 'body-scan' | 'loving-kindness';

const MeditationTimer: React.FC<MeditationTimerProps> = ({ onBack }) => {
  const [selectedType, setSelectedType] = useState<MeditationType>('mindfulness');
  const [duration, setDuration] = useState(5); // minutes
  const [timeLeft, setTimeLeft] = useState(duration * 60); // seconds
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentPhase, setCurrentPhase] = useState(0);
  
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meditationTypes = [
    {
      id: 'mindfulness' as MeditationType,
      name: 'Mindfulness',
      description: 'Focus on present moment awareness',
      color: 'from-blue-400 to-blue-600',
      phases: [
        { time: 60, instruction: "Find a comfortable position and close your eyes. Take three deep breaths." },
        { time: 120, instruction: "Notice your breath flowing naturally. Don't try to change it." },
        { time: 180, instruction: "When thoughts arise, gently acknowledge them and return to your breath." },
        { time: 60, instruction: "Slowly bring your attention back to the room. Open your eyes when ready." }
      ]
    },
    {
      id: 'breathing' as MeditationType,
      name: 'Breathing Focus',
      description: 'Concentrate on breath patterns',
      color: 'from-green-400 to-green-600',
      phases: [
        { time: 60, instruction: "Place one hand on your chest, one on your belly. Begin breathing deeply." },
        { time: 180, instruction: "Focus on the rise and fall of your belly. Count each breath." },
        { time: 120, instruction: "If your mind wanders, gently return focus to the counting." },
        { time: 60, instruction: "Take three more deep breaths and slowly open your eyes." }
      ]
    },
    {
      id: 'body-scan' as MeditationType,
      name: 'Body Scan',
      description: 'Progressive body awareness',
      color: 'from-purple-400 to-purple-600',
      phases: [
        { time: 60, instruction: "Lie down comfortably. Start by noticing your toes." },
        { time: 120, instruction: "Slowly move your attention up your legs, noticing any sensations." },
        { time: 120, instruction: "Continue scanning through your torso, arms, and shoulders." },
        { time: 120, instruction: "Focus on your neck, head, and face. Release any tension." }
      ]
    },
    {
      id: 'loving-kindness' as MeditationType,
      name: 'Loving Kindness',
      description: 'Cultivate compassion and love',
      color: 'from-pink-400 to-pink-600',
      phases: [
        { time: 60, instruction: "Think of yourself and silently say: 'May I be happy, may I be peaceful.'" },
        { time: 120, instruction: "Think of a loved one. Send them the same loving wishes." },
        { time: 120, instruction: "Think of a neutral person. Extend these wishes to them." },
        { time: 120, instruction: "Think of someone difficult. Try to send them compassion." }
      ]
    }
  ];

  const currentMeditation = meditationTypes.find(m => m.id === selectedType)!;

  // Timer logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsActive(false);
            setIsCompleted(true);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft]);

  // Update timeLeft when duration changes
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(duration * 60);
      setIsCompleted(false);
      setCurrentPhase(0);
    }
  }, [duration, isActive]);

  // Phase progression
  useEffect(() => {
    const totalTime = duration * 60;
    const elapsed = totalTime - timeLeft;
    let cumulativeTime = 0;
    
    for (let i = 0; i < currentMeditation.phases.length; i++) {
      cumulativeTime += currentMeditation.phases[i].time;
      if (elapsed < cumulativeTime) {
        setCurrentPhase(i);
        break;
      }
    }
  }, [timeLeft, currentMeditation, duration]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(duration * 60);
    setIsCompleted(false);
    setCurrentPhase(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Meditation Timer</h1>
            <p className="text-slate-600">Guided meditation sessions for inner peace</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Meditation Type Selection */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Choose Your Practice</h3>
            <div className="space-y-3">
              {meditationTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedType(type.id);
                    resetTimer();
                  }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    selectedType === type.id
                      ? 'border-violet-400 bg-violet-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${type.color} mb-2`} />
                  <h4 className="font-medium text-slate-800 mb-1">{type.name}</h4>
                  <p className="text-xs text-slate-600">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Timer Interface */}
          <div className="lg:col-span-2">
            {/* Duration Selection */}
            {!isActive && !isCompleted && (
              <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Session Duration</h3>
                <div className="flex gap-2 flex-wrap">
                  {[3, 5, 10, 15, 20, 30].map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => setDuration(minutes)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                        duration === minutes
                          ? 'border-violet-400 bg-violet-50 text-violet-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Timer Display */}
            <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
              {/* Progress Circle */}
              <div className="relative inline-block mb-6">
                <svg width="200" height="200" className="transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 90}`}
                    strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* Time display */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div>
                    <div className="text-3xl font-bold text-slate-800">
                      {formatTime(timeLeft)}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {isCompleted ? 'Complete!' : isActive ? 'Meditating...' : 'Ready to start'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <button
                  onClick={toggleTimer}
                  className={`flex items-center justify-center w-16 h-16 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-red-400 to-red-600'
                      : isCompleted
                      ? 'bg-gradient-to-r from-green-400 to-green-600'
                      : 'bg-gradient-to-r from-violet-400 to-violet-600'
                  }`}
                >
                  {isActive ? (
                    <Pause className="w-6 h-6" />
                  ) : isCompleted ? (
                    <RotateCcw className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-1" />
                  )}
                </button>
                
                <button
                  onClick={resetTimer}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
                    soundEnabled
                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              </div>

              {/* Current Instruction */}
              {(isActive || isCompleted) && (
                <div className="bg-gradient-to-r from-violet-50 to-blue-50 rounded-lg p-4 border border-violet-200">
                  <div className="text-sm text-violet-600 font-medium mb-2">
                    {isCompleted ? 'Session Complete' : `Phase ${currentPhase + 1} of ${currentMeditation.phases.length}`}
                  </div>
                  <p className="text-slate-700">
                    {isCompleted 
                      ? "Well done! Take a moment to notice how you feel. Return to this peaceful state whenever you need it."
                      : currentMeditation.phases[currentPhase]?.instruction
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Meditation Benefits */}
            <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 border border-green-200 mt-6">
              <h3 className="text-lg font-semibold text-green-800 mb-3">🧘‍♀️ Benefits of {currentMeditation.name}</h3>
              <ul className="text-green-700 space-y-2 text-sm">
                {selectedType === 'mindfulness' && (
                  <>
                    <li>• Reduces anxiety and stress levels</li>
                    <li>• Improves focus and concentration</li>
                    <li>• Enhances emotional regulation</li>
                    <li>• Promotes better sleep quality</li>
                  </>
                )}
                {selectedType === 'breathing' && (
                  <>
                    <li>• Activates the relaxation response</li>
                    <li>• Lowers blood pressure and heart rate</li>
                    <li>• Increases oxygen flow to the brain</li>
                    <li>• Helps manage panic attacks</li>
                  </>
                )}
                {selectedType === 'body-scan' && (
                  <>
                    <li>• Releases physical tension</li>
                    <li>• Improves body awareness</li>
                    <li>• Helps with chronic pain management</li>
                    <li>• Promotes deeper relaxation</li>
                  </>
                )}
                {selectedType === 'loving-kindness' && (
                  <>
                    <li>• Increases empathy and compassion</li>
                    <li>• Reduces negative emotions</li>
                    <li>• Improves relationships</li>
                    <li>• Boosts overall happiness</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeditationTimer;
