import React, { useMemo, useState } from 'react';
import { activityStats, recordActivity } from '../utils/activityLog';
import { ArrowLeft, Play, Pause, RotateCcw, Heart, Brain, Moon, Waves, Flower2, Sparkles } from 'lucide-react';
import BreathingExercise from './activities/BreathingExercise';
import MeditationTimer from './activities/MeditationTimer';
import CalmingGame from './activities/CalmingGame';
import ProgressiveRelaxation from './activities/ProgressiveRelaxation';
import GratitudeJournal from './activities/GratitudeJournal';
import SoundTherapy from './activities/SoundTherapy';

interface WellnessActivitiesProps {
  onBack: () => void;
}

type ActivityType = 'breathing' | 'meditation' | 'game' | 'relaxation' | 'gratitude' | 'sounds' | null;

const WellnessActivities: React.FC<WellnessActivitiesProps> = ({ onBack }) => {
  const [currentActivity, setCurrentActivity] = useState<ActivityType>(null);
  const stats = useMemo(() => activityStats(), [currentActivity]);

  const activities = [
    {
      id: 'breathing' as ActivityType,
      title: 'Breathing Exercise',
      description: 'Guided breathing to reduce anxiety and stress',
      icon: <Waves className="w-8 h-8" />,
      color: 'from-blue-400 to-cyan-500',
      duration: '5-10 min'
    },
    {
      id: 'meditation' as ActivityType,
      title: 'Meditation Timer',
      description: 'Mindful meditation with peaceful guidance',
      icon: <Brain className="w-8 h-8" />,
      color: 'from-purple-400 to-pink-500',
      duration: '10-30 min'
    },
    {
      id: 'game' as ActivityType,
      title: 'Calming Game',
      description: 'Interactive mindfulness activities',
      icon: <Sparkles className="w-8 h-8" />,
      color: 'from-green-400 to-teal-500',
      duration: '5-15 min'
    },
    {
      id: 'relaxation' as ActivityType,
      title: 'Progressive Relaxation',
      description: 'Release tension from your body',
      icon: <Moon className="w-8 h-8" />,
      color: 'from-indigo-400 to-purple-500',
      duration: '15-20 min'
    },
    {
      id: 'gratitude' as ActivityType,
      title: 'Gratitude Journal',
      description: 'Reflect on positive moments',
      icon: <Heart className="w-8 h-8" />,
      color: 'from-pink-400 to-rose-500',
      duration: '5-10 min'
    },
    {
      id: 'sounds' as ActivityType,
      title: 'Sound Therapy',
      description: 'Calming nature sounds and music',
      icon: <Flower2 className="w-8 h-8" />,
      color: 'from-emerald-400 to-green-500',
      duration: 'Ongoing'
    }
  ];

  if (currentActivity) {
    const renderActivity = () => {
      switch (currentActivity) {
        case 'breathing':
          return <BreathingExercise onBack={() => setCurrentActivity(null)} />;
        case 'meditation':
          return <MeditationTimer onBack={() => setCurrentActivity(null)} />;
        case 'game':
          return <CalmingGame onBack={() => setCurrentActivity(null)} />;
        case 'relaxation':
          return <ProgressiveRelaxation onBack={() => setCurrentActivity(null)} />;
        case 'gratitude':
          return <GratitudeJournal onBack={() => setCurrentActivity(null)} />;
        case 'sounds':
          return <SoundTherapy onBack={() => setCurrentActivity(null)} />;
        default:
          return null;
      }
    };

    return renderActivity();
  }

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
            <h1 className="text-3xl font-bold text-slate-800">Wellness Activities</h1>
            <p className="text-slate-600 mt-1">Choose an activity to help you relax and unwind</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Sessions Today</p>
                <p className="text-xl font-semibold text-slate-800">{stats.today}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Brain className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Activities Tried</p>
                <p className="text-xl font-semibold text-slate-800">{stats.distinct}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Streak Days</p>
                <p className="text-xl font-semibold text-slate-800">{stats.streak}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity) => (
            <button
              key={activity.id}
              onClick={() => { recordActivity(String(activity.id)); setCurrentActivity(activity.id); }}
              className="group relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-left"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${activity.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                {activity.icon}
              </div>
              
              <h3 className="text-xl font-semibold text-slate-800 mb-2 group-hover:text-violet-600 transition-colors">
                {activity.title}
              </h3>
              
              <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                {activity.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  {activity.duration}
                </span>
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                  <Play className="w-4 h-4 text-violet-600" />
                </div>
              </div>
              
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </button>
          ))}
        </div>

        {/* Tips Section */}
        <div className="mt-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-6 text-white">
          <h3 className="text-xl font-semibold mb-3">💡 Daily Wellness Tip</h3>
          <p className="text-violet-100 leading-relaxed">
            Taking just 5 minutes for deep breathing can significantly reduce stress levels and improve your mood. 
            Try to incorporate these activities into your daily routine for maximum benefit.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WellnessActivities;
