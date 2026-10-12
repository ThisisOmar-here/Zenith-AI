import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Target, Palette, Waves, Star } from 'lucide-react';

interface CalmingGameProps {
  onBack: () => void;
}

type GameType = 'popping' | 'coloring' | 'tracing' | 'pattern';

const CalmingGame: React.FC<CalmingGameProps> = ({ onBack }) => {
  const [currentGame, setCurrentGame] = useState<GameType>('popping');
  const [score, setScore] = useState(0);
  const [bubbles, setBubbles] = useState<Array<{id: number, x: number, y: number, size: number, color: string}>>([]);
  const [nextBubbleId, setNextBubbleId] = useState(0);

  // Bubble Popping Game
  const generateBubble = () => {
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];
    const newBubble = {
      id: nextBubbleId,
      x: Math.random() * 80 + 10, // 10% to 90% of container width
      y: Math.random() * 70 + 15, // 15% to 85% of container height
      size: Math.random() * 40 + 30, // 30px to 70px
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    
    setBubbles(prev => [...prev, newBubble]);
    setNextBubbleId(prev => prev + 1);
  };

  const popBubble = (id: number) => {
    setBubbles(prev => prev.filter(bubble => bubble.id !== id));
    setScore(prev => prev + 1);
  };

  const resetGame = () => {
    setBubbles([]);
    setScore(0);
    setNextBubbleId(0);
  };

  // Auto-generate bubbles for popping game
  useEffect(() => {
    if (currentGame === 'popping') {
      const interval = setInterval(() => {
        if (bubbles.length < 8) {
          generateBubble();
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [currentGame, bubbles.length, nextBubbleId]);

  // Initialize first bubble
  useEffect(() => {
    if (currentGame === 'popping' && bubbles.length === 0) {
      generateBubble();
    }
  }, [currentGame]);

  const games = [
    {
      id: 'popping' as GameType,
      name: 'Bubble Pop',
      description: 'Pop bubbles to release stress',
      icon: <Waves className="w-5 h-5" />,
      color: 'from-blue-400 to-cyan-500'
    },
    {
      id: 'coloring' as GameType,
      name: 'Color Therapy',
      description: 'Color mandalas mindfully',
      icon: <Palette className="w-5 h-5" />,
      color: 'from-purple-400 to-pink-500'
    },
    {
      id: 'tracing' as GameType,
      name: 'Pattern Trace',
      description: 'Follow calming patterns',
      icon: <Target className="w-5 h-5" />,
      color: 'from-green-400 to-teal-500'
    },
    {
      id: 'pattern' as GameType,
      name: 'Zen Patterns',
      description: 'Create beautiful patterns',
      icon: <Star className="w-5 h-5" />,
      color: 'from-indigo-400 to-purple-500'
    }
  ];

  const renderBubblePoppingGame = () => (
    <div className="relative bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 overflow-hidden" style={{ height: '400px' }}>
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2">
        <span className="text-sm font-medium text-blue-800">Score: {score}</span>
      </div>
      
      {bubbles.map(bubble => (
        <button
          key={bubble.id}
          onClick={() => popBubble(bubble.id)}
          className="absolute rounded-full animate-pulse hover:scale-110 transition-transform duration-200 shadow-lg"
          style={{
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            backgroundColor: bubble.color,
            opacity: 0.8
          }}
        >
          <div 
            className="w-full h-full rounded-full"
            style={{
              background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), ${bubble.color})`
            }}
          />
        </button>
      ))}
      
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-blue-700 text-sm mb-2">Tap the bubbles to pop them!</p>
        <button
          onClick={resetGame}
          className="bg-white/80 backdrop-blur-sm text-blue-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white transition-colors"
        >
          Reset Game
        </button>
      </div>
    </div>
  );

  const renderColoringActivity = () => {
    const [selectedColor, setSelectedColor] = useState('#3B82F6');
    const [coloredSections, setColoredSections] = useState<{[key: string]: string}>({});
    
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];
    
    const colorSection = (sectionId: string) => {
      setColoredSections(prev => ({
        ...prev,
        [sectionId]: selectedColor
      }));
    };

    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        {/* Color Palette */}
        <div className="flex flex-wrap gap-2 mb-6">
          {colors.map((color, index) => (
            <button
              key={index}
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                selectedColor === color ? 'border-slate-400 scale-110' : 'border-slate-200'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        
        {/* Simple Mandala SVG */}
        <div className="flex justify-center">
          <svg width="300" height="300" viewBox="0 0 300 300" className="border border-slate-200 rounded-lg">
            {/* Outer petals */}
            {Array.from({ length: 8 }).map((_, i) => (
              <path
                key={`outer-${i}`}
                d={`M 150 150 L ${150 + 80 * Math.cos(i * Math.PI / 4)} ${150 + 80 * Math.sin(i * Math.PI / 4)} A 20 20 0 0 1 ${150 + 80 * Math.cos((i + 1) * Math.PI / 4)} ${150 + 80 * Math.sin((i + 1) * Math.PI / 4)} Z`}
                fill={coloredSections[`outer-${i}`] || '#f8fafc'}
                stroke="#e2e8f0"
                strokeWidth="2"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => colorSection(`outer-${i}`)}
              />
            ))}
            
            {/* Inner petals */}
            {Array.from({ length: 8 }).map((_, i) => (
              <path
                key={`inner-${i}`}
                d={`M 150 150 L ${150 + 50 * Math.cos(i * Math.PI / 4 + Math.PI / 8)} ${150 + 50 * Math.sin(i * Math.PI / 4 + Math.PI / 8)} A 15 15 0 0 1 ${150 + 50 * Math.cos((i + 1) * Math.PI / 4 + Math.PI / 8)} ${150 + 50 * Math.sin((i + 1) * Math.PI / 4 + Math.PI / 8)} Z`}
                fill={coloredSections[`inner-${i}`] || '#f8fafc'}
                stroke="#e2e8f0"
                strokeWidth="2"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => colorSection(`inner-${i}`)}
              />
            ))}
            
            {/* Center circle */}
            <circle
              cx="150"
              cy="150"
              r="25"
              fill={coloredSections['center'] || '#f8fafc'}
              stroke="#e2e8f0"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => colorSection('center')}
            />
          </svg>
        </div>
        
        <div className="text-center mt-4">
          <button
            onClick={() => setColoredSections({})}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            Clear Canvas
          </button>
        </div>
      </div>
    );
  };

  const renderPatternTracing = () => {
    const [traceProgress, setTraceProgress] = useState(0);
    
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Follow the Pattern</h3>
          <p className="text-slate-600 text-sm">Trace the infinity symbol slowly with your finger or mouse</p>
        </div>
        
        <div className="flex justify-center mb-6">
          <svg width="250" height="120" viewBox="0 0 250 120" className="border border-slate-200 rounded-lg bg-slate-50">
            {/* Infinity symbol path */}
            <path
              d="M 50 60 C 50 30, 90 30, 125 60 C 160 90, 200 90, 200 60 C 200 30, 160 30, 125 60 C 90 90, 50 90, 50 60"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="4"
              strokeLinecap="round"
            />
            
            {/* Progress indicator */}
            <path
              d="M 50 60 C 50 30, 90 30, 125 60 C 160 90, 200 90, 200 60 C 200 30, 160 30, 125 60 C 90 90, 50 90, 50 60"
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="800"
              strokeDashoffset={800 - (traceProgress * 8)}
              className="transition-all duration-300"
            />
            
            {/* Moving dot */}
            <circle
              cx="50"
              cy="60"
              r="6"
              fill="#8B5CF6"
              className="animate-pulse"
              style={{
                transform: `translateX(${traceProgress * 1.5}px)`,
                transition: 'transform 0.3s ease'
              }}
            />
          </svg>
        </div>
        
        <div className="space-y-4">
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-sm text-purple-700">Progress: {Math.round(traceProgress)}%</div>
            <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${traceProgress}%` }}
              />
            </div>
          </div>
          
          <button
            onClick={() => setTraceProgress(prev => Math.min(prev + 10, 100))}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Continue Trace
          </button>
          
          <button
            onClick={() => setTraceProgress(0)}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors ml-2"
          >
            Reset
          </button>
        </div>
      </div>
    );
  };

  const renderZenPatterns = () => {
    const [pattern, setPattern] = useState<Array<{x: number, y: number}>>([]);
    
    const addPatternPoint = (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      
      setPattern(prev => [...prev, { x, y }]);
    };
    
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Create Zen Patterns</h3>
          <p className="text-slate-600 text-sm">Click anywhere to create a peaceful pattern</p>
        </div>
        
        <div 
          className="relative bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 cursor-crosshair"
          style={{ height: '300px' }}
          onClick={addPatternPoint}
        >
          {pattern.map((point, index) => (
            <div
              key={index}
              className="absolute w-4 h-4 bg-indigo-500 rounded-full animate-ping"
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                transform: 'translate(-50%, -50%)',
                animationDelay: `${index * 0.1}s`
              }}
            />
          ))}
          
          {/* Connect dots with lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {pattern.map((point, index) => {
              if (index === 0) return null;
              const prevPoint = pattern[index - 1];
              return (
                <line
                  key={`line-${index}`}
                  x1={`${prevPoint.x}%`}
                  y1={`${prevPoint.y}%`}
                  x2={`${point.x}%`}
                  y2={`${point.y}%`}
                  stroke="#6366F1"
                  strokeWidth="2"
                  opacity="0.6"
                />
              );
            })}
          </svg>
        </div>
        
        <div className="text-center mt-4">
          <button
            onClick={() => setPattern([])}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            Clear Pattern
          </button>
        </div>
      </div>
    );
  };

  const renderCurrentGame = () => {
    switch (currentGame) {
      case 'popping':
        return renderBubblePoppingGame();
      case 'coloring':
        return renderColoringActivity();
      case 'tracing':
        return renderPatternTracing();
      case 'pattern':
        return renderZenPatterns();
      default:
        return renderBubblePoppingGame();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
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
            <h1 className="text-2xl font-bold text-slate-800">Calming Games</h1>
            <p className="text-slate-600">Interactive activities to help you relax and focus</p>
          </div>
        </div>

        {/* Game Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => {
                setCurrentGame(game.id);
                resetGame();
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                currentGame === game.id
                  ? 'border-violet-400 bg-violet-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${game.color} flex items-center justify-center text-white mb-3`}>
                {game.icon}
              </div>
              <h3 className="font-medium text-slate-800 mb-1">{game.name}</h3>
              <p className="text-xs text-slate-600">{game.description}</p>
            </button>
          ))}
        </div>

        {/* Current Game */}
        <div className="mb-8">
          {renderCurrentGame()}
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-3">🎮 Gaming for Wellness</h3>
          <ul className="text-green-700 space-y-2 text-sm">
            <li>• These activities help redirect anxious thoughts into positive focus</li>
            <li>• Take your time and enjoy the process rather than rushing</li>
            <li>• If you feel overwhelmed, switch to a different activity</li>
            <li>• Regular practice can improve concentration and reduce stress</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CalmingGame;
