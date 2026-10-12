import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, RotateCcw, Timer, Shuffle, StopCircle, Loader, CloudRain, Waves as WavesIcon, Wind, Bird } from 'lucide-react';
import { audioManager, SoundConfig } from '../../utils/audioManager';
import { SOUND_LIBRARY, SOUND_CATEGORIES, SOUND_PRESETS, getSoundsByCategory, getSoundById } from '../../data/soundLibrary';

interface SoundTherapyProps {
  onBack: () => void;
}

interface PlayingSound {
  id: string;
  volume: number;
}

const SoundTherapy: React.FC<SoundTherapyProps> = ({ onBack }) => {
  const [playingSounds, setPlayingSounds] = useState<PlayingSound[]>([]);
  const [masterVolume, setMasterVolume] = useState(80);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'nature'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  // Initialize audio system
  useEffect(() => {
    const initializeAudio = async () => {
      if (initRef.current) return;
      initRef.current = true;
      
      try {
        setIsLoading(true);
        setLoadingProgress(0);
        
        // Preload all sounds with progress tracking
        const totalSounds = SOUND_LIBRARY.length;
        let loadedCount = 0;
        
        for (const sound of SOUND_LIBRARY) {
          await audioManager.loadSound(sound.id, sound);
          loadedCount++;
          setLoadingProgress((loadedCount / totalSounds) * 100);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize audio:', error);
        setIsLoading(false);
      }
    };

    initializeAudio();

    // Cleanup on unmount
    return () => {
      audioManager.stopAllSounds();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (timer && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            stopAll();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timer, timeLeft]);

  const toggleSound = async (soundId: string) => {
    const isCurrentlyPlaying = playingSounds.some(s => s.id === soundId);
    
    if (isCurrentlyPlaying) {
      // Stop the sound
      audioManager.stopSound(soundId);
      setPlayingSounds(prev => prev.filter(s => s.id !== soundId));
    } else {
      // Start the sound
      const soundConfig = getSoundById(soundId);
      if (soundConfig) {
        try {
          const volume = soundConfig.volume * (masterVolume / 100);
          await audioManager.playSound(soundId, soundConfig, volume);
          setPlayingSounds(prev => [...prev, { id: soundId, volume: soundConfig.volume }]);
          setIsPlaying(true);
        } catch (error) {
          console.error('Failed to play sound:', error);
        }
      }
    }
  };

  const setVolume = (soundId: string, volume: number) => {
    audioManager.setVolume(soundId, (volume / 100) * (masterVolume / 100));
    setPlayingSounds(prev =>
      prev.map(sound =>
        sound.id === soundId ? { ...sound, volume: volume / 100 } : sound
      )
    );
  };

  const updateMasterVolume = (volume: number) => {
    setMasterVolume(volume);
    // Update all playing sounds with new master volume
    playingSounds.forEach(sound => {
      audioManager.setVolume(sound.id, sound.volume * (volume / 100));
    });
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      audioManager.stopAllSounds();
      setPlayingSounds([]);
    } else {
      // Resume all sounds that were playing
      playingSounds.forEach(async (sound) => {
        const soundConfig = getSoundById(sound.id);
        if (soundConfig) {
          try {
            await audioManager.playSound(sound.id, soundConfig, sound.volume * (masterVolume / 100));
          } catch (error) {
            console.error('Failed to resume sound:', error);
          }
        }
      });
    }
    setIsPlaying(!isPlaying);
  };

  const stopAll = () => {
    audioManager.stopAllSounds();
    setPlayingSounds([]);
    setIsPlaying(false);
    setTimer(null);
    setTimeLeft(0);
    setSelectedPreset(null);
  };

  const setTimerDuration = (minutes: number) => {
    setTimer(minutes);
    setTimeLeft(minutes * 60);
  };

  const applyPreset = async (presetId: string) => {
    const preset = SOUND_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    // Stop all current sounds
    audioManager.stopAllSounds();

    // Start preset sounds
    const newPlayingSounds: PlayingSound[] = [];
    for (const presetSound of preset.sounds) {
      const soundConfig = getSoundById(presetSound.id);
      if (soundConfig) {
        try {
          const volume = presetSound.volume * (masterVolume / 100);
          await audioManager.playSound(presetSound.id, soundConfig, volume);
          newPlayingSounds.push({ id: presetSound.id, volume: presetSound.volume });
        } catch (error) {
          console.error('Failed to play preset sound:', error);
        }
      }
    }
    
    setPlayingSounds(newPlayingSounds);
    setSelectedPreset(presetId);
    setIsPlaying(true);
  };

  const randomizePreset = () => {
    const randomPreset = SOUND_PRESETS[Math.floor(Math.random() * SOUND_PRESETS.length)];
    applyPreset(randomPreset.id);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isActive = (soundId: string) => {
    return playingSounds.some(s => s.id === soundId);
  };

  const getSoundVolume = (soundId: string) => {
    const sound = playingSounds.find(s => s.id === soundId);
    return sound?.volume ? Math.round(sound.volume * 100) : 50;
  };

  const filteredSounds = activeCategory === 'all' 
    ? SOUND_LIBRARY 
    : getSoundsByCategory(activeCategory);

  const categories = [
    { id: 'all' as const, name: 'All Sounds', icon: '🎵' },
    ...Object.entries(SOUND_CATEGORIES).map(([id, category]) => ({
      id: id as keyof typeof SOUND_CATEGORIES,
      name: category.name,
      icon: category.icon
    }))
  ];

  const iconOverride: Record<string, React.ReactNode> = {
    rain: <CloudRain className="w-6 h-6" />,
    ocean: <WavesIcon className="w-6 h-6" />,
    wind: <Wind className="w-6 h-6" />,
    birds: <Bird className="w-6 h-6" />,
    forest: <Wind className="w-6 h-6" />
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-slate-200">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
              <Volume2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Sound Library</h3>
          <p className="text-gray-600 mb-4">Preparing high-quality therapeutic sounds...</p>
          <div className="w-64 bg-gray-200 rounded-full h-3 mx-auto">
            <div 
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">{Math.round(loadingProgress)}% complete</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/50 p-6">
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
            <h1 className="text-2xl font-bold text-slate-800">Sound Therapy</h1>
            <p className="text-slate-600">Ambient soundscapes generated live in your browser</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Master Controls */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Controls</h3>
              
              {/* Play/Pause/Stop */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={togglePlayPause}
                  disabled={playingSounds.length === 0}
                  className={`flex items-center justify-center w-12 h-12 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 ${
                    isPlaying && playingSounds.length > 0
                      ? 'bg-gradient-to-r from-red-400 to-red-600'
                      : playingSounds.length > 0
                      ? 'bg-gradient-to-r from-green-400 to-green-600'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                
                <button
                  onClick={stopAll}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  title="Stop All"
                >
                  <StopCircle className="w-4 h-4" />
                </button>
                
                <button
                  onClick={randomizePreset}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
                  title="Random Preset"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>

              {/* Master Volume */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Master Volume</span>
                  <span className="text-xs text-slate-500">{masterVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => updateMasterVolume(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Timer */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Timer className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Timer</span>
                  {timer && (
                    <span className="text-sm font-mono text-purple-600">
                      {formatTime(timeLeft)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map(minutes => (
                    <button
                      key={minutes}
                      onClick={() => setTimerDuration(minutes)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        timer === minutes
                          ? 'bg-purple-100 border-2 border-purple-400 text-purple-700'
                          : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Presets */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Therapeutic Presets</h3>
              <div className="space-y-3">
                {SOUND_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                      selectedPreset === preset.id
                        ? 'bg-purple-50 border-2 border-purple-400'
                        : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-medium text-slate-800 text-sm mb-1">{preset.name}</div>
                    <div className="text-xs text-slate-600">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sound Selection */}
          <div className="lg:col-span-3">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                    activeCategory === category.id
                      ? 'border-purple-400 bg-purple-50 text-purple-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                </button>
              ))}
            </div>

            {/* Sound Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {filteredSounds.map(sound => {
                const soundIsActive = isActive(sound.id);
                const volume = getSoundVolume(sound.id);
                
                return (
                  <div
                    key={sound.id}
                    className={`bg-white rounded-xl p-4 border-2 transition-all duration-200 shadow-sm hover:shadow-md ${
                      soundIsActive
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => toggleSound(sound.id)}
                      className={`w-full text-left mb-3 p-4 rounded-lg transition-all duration-200 ${
                        soundIsActive
                          ? `bg-gradient-to-r ${sound.color} text-white`
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-2xl mb-2">{iconOverride[sound.id] ?? sound.icon}</div>
                      <div className="font-medium text-sm mb-1">{sound.name}</div>
                      <div className="text-xs opacity-75">{sound.description}</div>
                      <div className="text-xs opacity-60 mt-1 capitalize">{sound.category.replace('-', ' ')}</div>
                    </button>
                    
                    {soundIsActive && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <VolumeX className="w-3 h-3 text-slate-400" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume}
                            onChange={(e) => setVolume(sound.id, Number(e.target.value))}
                            className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                          <Volume2 className="w-3 h-3 text-slate-400" />
                        </div>
                        <div className="text-center text-xs text-slate-500">{volume}%</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active Sounds Summary */}
            {playingSounds.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200 mb-6">
                <h3 className="text-lg font-semibold text-purple-800 mb-3">
                  Currently Playing ({playingSounds.length} sounds)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {playingSounds.map(playingSound => {
                    const sound = getSoundById(playingSound.id);
                    if (!sound) return null;
                    return (
                      <div
                        key={playingSound.id}
                        className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-purple-200"
                      >
                        <span>{sound.icon}</span>
                        <span className="text-sm font-medium text-slate-700">{sound.name}</span>
                        <span className="text-xs text-slate-500">{Math.round(playingSound.volume * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Benefits & Audio Information */}
            <div className="grid">
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-200">
                <h3 className="text-lg font-semibold text-teal-800 mb-3">🎵 Sound Therapy Benefits</h3>
                <ul className="text-teal-700 space-y-2 text-sm">
                  <li>• <strong>Nature Sounds:</strong> Reduce stress hormones and promote relaxation</li>
                  <li>• <strong>White/Pink Noise:</strong> Mask distracting sounds and improve focus</li>
                  <li>• <strong>Binaural Beats:</strong> Synchronize brainwaves for specific mental states</li>
                  <li>• <strong>Ambient Music:</strong> Enhance creativity and emotional well-being</li>
                </ul>
              </div>

             
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoundTherapy;
