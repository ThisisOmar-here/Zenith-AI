import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface BreathingExerciseProps {
  onBack: () => void;
}

type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'pause';

const BreathingExercise: React.FC<BreathingExerciseProps> = ({ onBack }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase>('inhale');
  const [cycleCount, setCycleCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedPattern, setSelectedPattern] = useState('478');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseStartRef = useRef<number>(0);

  const patterns = {
    '478': { name: '4-7-8 Relaxation', inhale: 4, hold: 7, exhale: 8, pause: 2 },
    '444': { name: 'Box Breathing', inhale: 4, hold: 4, exhale: 4, pause: 4 },
    '365': { name: 'Calming Breath', inhale: 3, hold: 6, exhale: 5, pause: 2 },
    '624': { name: 'Deep Focus', inhale: 6, hold: 2, exhale: 4, pause: 2 }
  };

  const currentPattern = patterns[selectedPattern as keyof typeof patterns];

  const phaseInstructions = {
    inhale: 'Breathe in slowly through your nose',
    hold: 'Hold your breath gently',
    exhale: 'Breathe out slowly through your mouth',
    pause: 'Rest and prepare for the next breath'
  };

  const getNextPhase = (phase: BreathingPhase): BreathingPhase => {
    const sequence: BreathingPhase[] = ['inhale', 'hold', 'exhale', 'pause'];
    const currentIndex = sequence.indexOf(phase);
    return sequence[(currentIndex + 1) % sequence.length];
  };

  const getPhaseDuration = (phase: BreathingPhase): number => {
    return currentPattern[phase];
  };

  useEffect(() => {
    if (isActive) {
      phaseStartRef.current = Date.now();
      setTimeRemaining(getPhaseDuration(currentPhase));

      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - phaseStartRef.current) / 1000);
        const phaseDuration = getPhaseDuration(currentPhase);
        const remaining = phaseDuration - elapsed;

        if (remaining <= 0) {
          const nextPhase = getNextPhase(currentPhase);
          setCurrentPhase(nextPhase);
          
          if (currentPhase === 'pause') {
            setCycleCount(prev => prev + 1);
          }
          
          phaseStartRef.current = Date.now();
          setTimeRemaining(getPhaseDuration(nextPhase));
        } else {
          setTimeRemaining(remaining);
        }
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, currentPhase, selectedPattern]);

  const handleStart = () => {
    setIsActive(true);
    setCurrentPhase('inhale');
    phaseStartRef.current = Date.now();
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setCurrentPhase('inhale');
    setCycleCount(0);
    setTimeRemaining(0);
  };

  const getCircleScale = () => {
    const phaseDuration = getPhaseDuration(currentPhase);
    const elapsed = phaseDuration - timeRemaining;
    const progress = elapsed / phaseDuration;

    switch (currentPhase) {
      case 'inhale':
        return 0.4 + (progress * 0.6); // Scale from 0.4 to 1.0
      case 'hold':
        return 1.0; // Stay at maximum
      case 'exhale':
        return 1.0 - (progress * 0.6); // Scale from 1.0 to 0.4
      case 'pause':
        return 0.4; // Stay at minimum
      default:
        return 0.4;
    }
  };

  const getCircleColor = () => {
    switch (currentPhase) {
      case 'inhale':
        return 'from-blue-400 to-cyan-500';
      case 'hold':
        return 'from-indigo-400 to-purple-500';
      case 'exhale':
        return 'from-green-400 to-teal-500';
      case 'pause':
        return 'from-slate-300 to-slate-400';
      default:
        return 'from-blue-400 to-cyan-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Breathing Exercise</h1>
              <p className="text-slate-600">Follow the circle to regulate your breathing</p>
            </div>
          </div>
          
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-xl transition-all duration-200 ${
              soundEnabled 
                ? 'bg-violet-100 text-violet-600 hover:bg-violet-200' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* Pattern Selection */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Choose a Pattern</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(patterns).map(([key, pattern]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedPattern(key);
                  handleReset();
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  selectedPattern === key
                    ? 'border-violet-400 bg-violet-50 text-violet-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="font-medium text-sm mb-1">{pattern.name}</div>
                <div className="text-xs text-slate-500">
                  {pattern.inhale}s - {pattern.hold}s - {pattern.exhale}s - {pattern.pause}s
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Breathing Circle */}
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm mb-8 text-center">
          <div className="relative mx-auto mb-8" style={{ width: '280px', height: '280px' }}>
            {/* Breathing Circle */}
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${getCircleColor()} transition-all duration-1000 ease-in-out shadow-lg`}
              style={{
                transform: `scale(${getCircleScale()})`,
                filter: 'blur(0.5px)'
              }}
            />
            
            {/* Inner Circle with Timer */}
            <div className="absolute inset-8 rounded-full bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center shadow-inner">
              <div className="text-4xl font-bold text-slate-800 mb-2">
                {timeRemaining || getPhaseDuration(currentPhase)}
              </div>
              <div className="text-sm text-slate-600 uppercase tracking-wider font-medium">
                {currentPhase}
              </div>
            </div>
            
            {/* Outer Ring Progress */}
            <div className="absolute -inset-2 rounded-full border-4 border-slate-200">
              <div
                className={`absolute inset-0 rounded-full border-4 border-transparent transition-all duration-300`}
                style={{
                  borderTopColor: currentPhase === 'inhale' ? '#3B82F6' : 'transparent',
                  borderRightColor: currentPhase === 'hold' ? '#8B5CF6' : 'transparent',
                  borderBottomColor: currentPhase === 'exhale' ? '#10B981' : 'transparent',
                  borderLeftColor: currentPhase === 'pause' ? '#94A3B8' : 'transparent',
                }}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-2 capitalize">
              {currentPhase}
            </h3>
            <p className="text-slate-600">
              {phaseInstructions[currentPhase]}
            </p>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{cycleCount}</div>
              <div className="text-sm text-slate-600">Cycles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">
                {Math.floor((cycleCount * (currentPattern.inhale + currentPattern.hold + currentPattern.exhale + currentPattern.pause)) / 60)}m
              </div>
              <div className="text-sm text-slate-600">Duration</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleReset}
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors duration-200"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            <button
              onClick={isActive ? handlePause : handleStart}
              className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">💡 Breathing Tips</h3>
          <ul className="text-blue-700 space-y-2 text-sm">
            <li>• Find a comfortable, quiet place to sit or lie down</li>
            <li>• Keep your shoulders relaxed and avoid forcing your breath</li>
            <li>• Focus on the circle and let it guide your breathing rhythm</li>
            <li>• If you feel dizzy, return to normal breathing and try again later</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BreathingExercise;
