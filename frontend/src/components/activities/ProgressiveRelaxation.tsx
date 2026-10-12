import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, ChevronRight } from 'lucide-react';

interface ProgressiveRelaxationProps {
  onBack: () => void;
}

interface BodyPart {
  id: string;
  name: string;
  instruction: string;
  duration: number; // seconds
  position: { x: number; y: number };
}

const ProgressiveRelaxation: React.FC<ProgressiveRelaxationProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const bodyParts: BodyPart[] = [
    {
      id: 'preparation',
      name: 'Preparation',
      instruction: 'Find a comfortable position lying down or sitting. Close your eyes and take three deep breaths.',
      duration: 30,
      position: { x: 50, y: 20 }
    },
    {
      id: 'feet',
      name: 'Feet & Toes',
      instruction: 'Focus on your feet and toes. Tense them tightly for 5 seconds... now release and feel the relaxation flowing through them.',
      duration: 45,
      position: { x: 50, y: 95 }
    },
    {
      id: 'calves',
      name: 'Calves',
      instruction: 'Tense your calf muscles by pointing your toes toward your head. Hold for 5 seconds... now let go and feel the tension melting away.',
      duration: 40,
      position: { x: 50, y: 85 }
    },
    {
      id: 'thighs',
      name: 'Thighs',
      instruction: 'Tighten your thigh muscles by pressing your knees together. Hold the tension... and release. Notice the warm, heavy feeling of relaxation.',
      duration: 40,
      position: { x: 50, y: 75 }
    },
    {
      id: 'glutes',
      name: 'Glutes & Hips',
      instruction: 'Squeeze your buttocks and hip muscles tightly. Feel the tension building... now let go completely and sink deeper into relaxation.',
      duration: 40,
      position: { x: 50, y: 65 }
    },
    {
      id: 'abdomen',
      name: 'Abdomen',
      instruction: 'Tense your stomach muscles as if someone is about to tickle you. Hold it... now release and let your belly soften and expand naturally.',
      duration: 40,
      position: { x: 50, y: 55 }
    },
    {
      id: 'chest',
      name: 'Chest',
      instruction: 'Take a deep breath and hold it, feeling tension in your chest. Hold... now exhale slowly and feel your chest becoming loose and relaxed.',
      duration: 45,
      position: { x: 50, y: 45 }
    },
    {
      id: 'hands',
      name: 'Hands & Arms',
      instruction: 'Make tight fists and tense your arm muscles from your hands to your shoulders. Hold the tension... now let go and feel your arms becoming limp and heavy.',
      duration: 45,
      position: { x: 30, y: 50 }
    },
    {
      id: 'shoulders',
      name: 'Shoulders & Neck',
      instruction: 'Lift your shoulders up toward your ears and tense your neck. Feel the tightness... now drop your shoulders and let your neck become completely relaxed.',
      duration: 45,
      position: { x: 50, y: 35 }
    },
    {
      id: 'face',
      name: 'Face & Head',
      instruction: 'Scrunch up your entire face - close your eyes tightly, wrinkle your forehead, clench your jaw. Hold... now release everything and feel your face becoming smooth and peaceful.',
      duration: 45,
      position: { x: 50, y: 25 }
    },
    {
      id: 'wholebody',
      name: 'Whole Body',
      instruction: 'Now tense your entire body from head to toe. Feel tension everywhere... and release. Let your whole body sink into deep, complete relaxation.',
      duration: 60,
      position: { x: 50, y: 50 }
    },
    {
      id: 'completion',
      name: 'Integration',
      instruction: 'Take a few moments to enjoy this peaceful state. Notice how relaxed and calm your body feels. When ready, slowly open your eyes and return to the present moment.',
      duration: 45,
      position: { x: 50, y: 20 }
    }
  ];

  const currentBodyPart = bodyParts[currentStep];

  // Timer logic
  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsActive(false);
            setCompletedSteps(prev => new Set([...prev, currentStep]));
            
            if (currentStep < bodyParts.length - 1) {
              // Auto-advance to next step after a brief pause
              setTimeout(() => {
                setCurrentStep(prev => prev + 1);
                setTimeLeft(bodyParts[currentStep + 1].duration);
              }, 2000);
            } else {
              setIsCompleted(true);
            }
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, currentStep, bodyParts]);

  // Initialize time when step changes
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(currentBodyPart.duration);
    }
  }, [currentStep, isActive, currentBodyPart.duration]);

  const startStep = () => {
    setTimeLeft(currentBodyPart.duration);
    setIsActive(true);
  };

  const pauseStep = () => {
    setIsActive(false);
  };

  const resetSession = () => {
    setCurrentStep(0);
    setIsActive(false);
    setTimeLeft(bodyParts[0].duration);
    setIsCompleted(false);
    setCompletedSteps(new Set());
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    setIsActive(false);
    setTimeLeft(bodyParts[stepIndex].duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((currentBodyPart.duration - timeLeft) / currentBodyPart.duration) * 100;
  const overallProgress = ((currentStep + (currentBodyPart.duration - timeLeft) / currentBodyPart.duration) / bodyParts.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Progressive Muscle Relaxation</h1>
            <p className="text-slate-600">Systematic tension and release for deep relaxation</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Body Diagram */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 border border-slate-200 h-fit">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center">Body Map</h3>
              
              {/* Simple body outline */}
              <div className="relative mx-auto" style={{ width: '200px', height: '400px' }}>
                <svg width="200" height="400" viewBox="0 0 200 400" className="border border-slate-200 rounded-lg bg-gradient-to-b from-blue-50 to-purple-50">
                  {/* Body outline */}
                  <ellipse cx="100" cy="50" rx="25" ry="35" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
                  <rect x="85" y="80" width="30" height="60" rx="15" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
                  <rect x="75" y="140" width="50" height="80" rx="25" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
                  <rect x="80" y="220" width="40" height="80" rx="20" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
                  <rect x="85" y="300" width="30" height="60" rx="15" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
                  <rect x="90" y="360" width="20" height="30" rx="10" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
                  
                  {/* Arms */}
                  <rect x="50" y="100" width="25" height="60" rx="12" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
                  <rect x="125" y="100" width="25" height="60" rx="12" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
                  
                  {/* Highlight current body part */}
                  {bodyParts.map((part, index) => {
                    if (index === currentStep && part.id !== 'preparation' && part.id !== 'completion') {
                      return (
                        <circle
                          key={part.id}
                          cx={part.position.x * 2}
                          cy={part.position.y * 4}
                          r="15"
                          fill="rgba(139, 92, 246, 0.3)"
                          stroke="#8B5CF6"
                          strokeWidth="3"
                          className="animate-pulse"
                        />
                      );
                    }
                    return null;
                  })}
                </svg>
              </div>
              
              {/* Progress indicator */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-slate-600 mb-2">
                  <span>Overall Progress</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Interface */}
          <div className="lg:col-span-2">
            {/* Current Step */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">{currentBodyPart.name}</h3>
                  <p className="text-slate-600">Step {currentStep + 1} of {bodyParts.length}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-800">{formatTime(timeLeft)}</div>
                  <div className="text-sm text-slate-600">
                    {isActive ? 'In Progress' : isCompleted ? 'Complete' : 'Ready'}
                  </div>
                </div>
              </div>

              {/* Step progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-3 mb-6">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Instruction */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200 mb-6">
                <p className="text-slate-700 leading-relaxed">{currentBodyPart.instruction}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={isActive ? pauseStep : startStep}
                  className={`flex items-center justify-center w-16 h-16 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-red-400 to-red-600'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}
                >
                  {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>
                
                <button
                  onClick={resetSession}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                
                {currentStep < bodyParts.length - 1 && (
                  <button
                    onClick={() => goToStep(currentStep + 1)}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Step Navigator */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Session Steps</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {bodyParts.map((part, index) => (
                  <button
                    key={part.id}
                    onClick={() => goToStep(index)}
                    className={`p-3 rounded-lg text-left transition-all duration-200 text-sm ${
                      index === currentStep
                        ? 'bg-purple-100 border-2 border-purple-400 text-purple-800'
                        : completedSteps.has(index)
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-medium">{part.name}</div>
                    <div className="text-xs opacity-75">{part.duration}s</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Completion Message */}
            {isCompleted && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 mt-6">
                <h3 className="text-lg font-semibold text-green-800 mb-3">🎉 Session Complete!</h3>
                <p className="text-green-700 mb-4">
                  Excellent work! You've completed the full progressive muscle relaxation session. 
                  Take a moment to notice how relaxed and peaceful your body feels now.
                </p>
                <button
                  onClick={resetSession}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Start New Session
                </button>
              </div>
            )}

            {/* Benefits */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mt-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">💆‍♀️ Benefits of Progressive Relaxation</h3>
              <ul className="text-blue-700 space-y-2 text-sm">
                <li>• Reduces muscle tension and physical stress</li>
                <li>• Helps identify areas where you hold tension</li>
                <li>• Promotes deeper, more restful sleep</li>
                <li>• Lowers blood pressure and heart rate</li>
                <li>• Effective for managing anxiety and panic attacks</li>
                <li>• Improves body awareness and mindfulness</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressiveRelaxation;
