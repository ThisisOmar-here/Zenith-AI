import { SoundConfig } from '../utils/audioManager';

// Every sound below is synthesised in the browser by utils/audioManager.ts.

export const SOUND_LIBRARY: SoundConfig[] = [
  // Forest Birds
  {
    id: 'birds',
    name: 'Forest Birds',
    category: 'nature',
    loop: true,
    volume: 0.7,
    description: 'Gentle morning bird songs creating a peaceful forest ambience',
    icon: '🐦',
    color: 'from-green-400 to-emerald-600'
  },
  // Forest ambience (wind + rustling trees)
  {
    id: 'forest',
    name: 'Forest Ambience',
    category: 'nature',
    loop: true,
    volume: 0.6,
    description: 'Soft forest background with subtle natural textures',
    icon: '🌲',
    color: 'from-lime-400 to-green-600'
  },
  // Rain
  {
    id: 'rain',
    name: 'Gentle Rain',
    category: 'nature',
    loop: true,
    volume: 0.8,
    description: 'Soothing steady rainfall for calm and focus',
    icon: '🌧️',
    color: 'from-blue-400 to-indigo-600'
  },
  // Ocean waves
  {
    id: 'ocean',
    name: 'Ocean Waves',
    category: 'nature',
    loop: true,
    volume: 0.75,
    description: 'Rolling shoreline waves for deep relaxation and meditation',
    icon: '🌊',
    color: 'from-cyan-400 to-blue-600'
  },
  // Wind
  {
    id: 'wind',
    name: 'Calm Wind',
    category: 'nature',
    loop: true,
    volume: 0.6,
    description: 'Gentle airy breeze for spacious clarity',
    icon: '💨',
    color: 'from-slate-300 to-slate-500'
  }
];

export const SOUND_CATEGORIES = {
  nature: {
    name: 'Nature Sounds',
    description: 'Natural environmental sounds for relaxation',
    icon: '🌿'
  }
} as const;

export const SOUND_PRESETS = [
  {
    id: 'forest-calm',
    name: 'Forest Calm',
    description: 'Birds with soft forest ambience',
    sounds: [
      { id: 'birds', volume: 0.6 },
      { id: 'forest', volume: 0.4 }
    ]
  },
  {
    id: 'rainy-day',
    name: 'Rainy Day',
    description: 'Rain with distant birds',
    sounds: [
      { id: 'rain', volume: 0.7 },
      { id: 'birds', volume: 0.3 }
    ]
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Ocean waves blended with calming wind',
    sounds: [
      { id: 'ocean', volume: 0.7 },
      { id: 'wind', volume: 0.4 }
    ]
  },
  {
    id: 'deep-calm',
    name: 'Deep Calm',
    description: 'Wind + rain for immersive relaxation',
    sounds: [
      { id: 'wind', volume: 0.5 },
      { id: 'rain', volume: 0.6 }
    ]
  },
  {
    id: 'pure-rain',
    name: 'Pure Rain',
    description: 'Single focus rainfall loop',
    sounds: [
      { id: 'rain', volume: 0.8 }
    ]
  }
];

// Function to get sounds by category
export function getSoundsByCategory(category: keyof typeof SOUND_CATEGORIES): SoundConfig[] {
  return SOUND_LIBRARY.filter(sound => sound.category === category);
}

// Function to get sound by ID
export function getSoundById(id: string): SoundConfig | undefined {
  return SOUND_LIBRARY.find(sound => sound.id === id);
}
