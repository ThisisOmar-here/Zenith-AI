import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Heart, Calendar, Star, Sparkles, Save, Edit3, Trash2 } from 'lucide-react';

interface GratitudeJournalProps {
  onBack: () => void;
}

interface GratitudeEntry {
  id: string;
  date: string;
  gratitudes: string[];
  reflection: string;
  mood: number; // 1-5 scale
  streak: number;
}

interface Prompt {
  id: string;
  text: string;
  category: 'simple' | 'deep' | 'challenging';
}

const GratitudeJournal: React.FC<GratitudeJournalProps> = ({ onBack }) => {
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<Partial<GratitudeEntry>>({
    gratitudes: ['', '', ''],
    reflection: '',
    mood: 3
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [streak, setStreak] = useState(0);

  const prompts: Prompt[] = [
    { id: '1', text: 'What made you smile today?', category: 'simple' },
    { id: '2', text: 'Who in your life are you most grateful for and why?', category: 'deep' },
    { id: '3', text: 'What challenge are you grateful for because it helped you grow?', category: 'challenging' },
    { id: '4', text: 'What small pleasure did you enjoy today?', category: 'simple' },
    { id: '5', text: 'What ability or skill are you thankful to have?', category: 'deep' },
    { id: '6', text: 'What mistake are you grateful for because it taught you something?', category: 'challenging' },
    { id: '7', text: 'What in nature are you grateful for right now?', category: 'simple' },
    { id: '8', text: 'How has someone shown you kindness recently?', category: 'deep' },
    { id: '9', text: 'What difficult situation has led to something positive?', category: 'challenging' },
    { id: '10', text: 'What technology or invention makes your life better?', category: 'simple' }
  ];

  const moodLabels = [
    { value: 1, label: 'Struggling', emoji: '😔', color: 'text-red-500' },
    { value: 2, label: 'Low', emoji: '😕', color: 'text-orange-500' },
    { value: 3, label: 'Okay', emoji: '😐', color: 'text-yellow-500' },
    { value: 4, label: 'Good', emoji: '😊', color: 'text-green-500' },
    { value: 5, label: 'Amazing', emoji: '😁', color: 'text-blue-500' }
  ];

  // Load entries from localStorage
  useEffect(() => {
    const savedEntries = localStorage.getItem('gratitude-entries');
    if (savedEntries) {
      const parsedEntries = JSON.parse(savedEntries);
      setEntries(parsedEntries);
      calculateStreak(parsedEntries);
    }
  }, []);

  const calculateStreak = (entriesArray: GratitudeEntry[]) => {
    if (entriesArray.length === 0) {
      setStreak(0);
      return;
    }

    const sortedEntries = [...entriesArray].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let currentStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      
      const dayDiff = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === currentStreak) {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    setStreak(currentStreak);
  };

  const saveEntry = () => {
    if (!currentEntry.gratitudes?.some(g => g.trim()) || !currentEntry.reflection?.trim()) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const newEntry: GratitudeEntry = {
      id: editingId || Date.now().toString(),
      date: today,
      gratitudes: currentEntry.gratitudes.filter(g => g.trim()),
      reflection: currentEntry.reflection || '',
      mood: currentEntry.mood || 3,
      streak: 0
    };

    let updatedEntries;
    if (editingId) {
      updatedEntries = entries.map(entry => 
        entry.id === editingId ? newEntry : entry
      );
    } else {
      updatedEntries = [...entries, newEntry];
    }

    setEntries(updatedEntries);
    localStorage.setItem('gratitude-entries', JSON.stringify(updatedEntries));
    calculateStreak(updatedEntries);

    // Reset form
    setCurrentEntry({
      gratitudes: ['', '', ''],
      reflection: '',
      mood: 3
    });
    setIsEditing(false);
    setEditingId(null);
    setSelectedPrompt(null);
  };

  const editEntry = (entry: GratitudeEntry) => {
    setCurrentEntry(entry);
    setIsEditing(true);
    setEditingId(entry.id);
  };

  const deleteEntry = (id: string) => {
    const updatedEntries = entries.filter(entry => entry.id !== id);
    setEntries(updatedEntries);
    localStorage.setItem('gratitude-entries', JSON.stringify(updatedEntries));
    calculateStreak(updatedEntries);
  };

  const updateGratitude = (index: number, value: string) => {
    const newGratitudes = [...(currentEntry.gratitudes || ['', '', ''])];
    newGratitudes[index] = value;
    setCurrentEntry({ ...currentEntry, gratitudes: newGratitudes });
  };

  const addGratitude = () => {
    const newGratitudes = [...(currentEntry.gratitudes || []), ''];
    setCurrentEntry({ ...currentEntry, gratitudes: newGratitudes });
  };

  const removeGratitude = (index: number) => {
    const newGratitudes = currentEntry.gratitudes?.filter((_, i) => i !== index) || [];
    setCurrentEntry({ ...currentEntry, gratitudes: newGratitudes });
  };

  const getTodaysEntry = () => {
    const today = new Date().toISOString().split('T')[0];
    return entries.find(entry => entry.date === today);
  };

  const getRandomPrompt = () => {
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    setSelectedPrompt(randomPrompt);
  };

  const todaysEntry = getTodaysEntry();
  const canWriteToday = !todaysEntry || isEditing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/50 p-6">
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
            <h1 className="text-2xl font-bold text-slate-800">Gratitude Journal</h1>
            <p className="text-slate-600">Daily practice of appreciation and reflection</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8" />
              <div>
                <div className="text-2xl font-bold">{streak}</div>
                <div className="text-amber-100">Day Streak</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8" />
              <div>
                <div className="text-2xl font-bold">{entries.length}</div>
                <div className="text-pink-100">Total Entries</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-400 to-indigo-500 text-white rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8" />
              <div>
                <div className="text-2xl font-bold">
                  {entries.length > 0 ? (entries.reduce((sum, entry) => sum + entry.mood, 0) / entries.length).toFixed(1) : '0'}
                </div>
                <div className="text-purple-100">Avg Mood</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Writing Section */}
          <div className="space-y-6">
            {/* Today's Entry */}
            {canWriteToday && (
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-slate-800">
                    {isEditing ? 'Edit Entry' : 'Today\'s Gratitude'}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    {new Date().toLocaleDateString()}
                  </div>
                </div>

                {/* Prompt */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-slate-700">Need inspiration?</span>
                    <button
                      onClick={getRandomPrompt}
                      className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full hover:shadow-md transition-all duration-200"
                    >
                      Get Prompt
                    </button>
                  </div>
                  {selectedPrompt && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
                      <p className="text-purple-700 text-sm">{selectedPrompt.text}</p>
                    </div>
                  )}
                </div>

                {/* Gratitude Items */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    What are you grateful for today?
                  </label>
                  <div className="space-y-3">
                    {currentEntry.gratitudes?.map((gratitude, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={gratitude}
                            onChange={(e) => updateGratitude(index, e.target.value)}
                            placeholder={`Gratitude ${index + 1}...`}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        {index >= 3 && (
                          <button
                            onClick={() => removeGratitude(index)}
                            className="flex items-center justify-center w-10 h-10 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    {(currentEntry.gratitudes?.length || 0) < 7 && (
                      <button
                        onClick={addGratitude}
                        className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm">Add another gratitude</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Reflection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Reflection
                  </label>
                  <textarea
                    value={currentEntry.reflection}
                    onChange={(e) => setCurrentEntry({ ...currentEntry, reflection: e.target.value })}
                    placeholder="How did these moments of gratitude make you feel? What patterns do you notice?"
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Mood */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    How are you feeling today?
                  </label>
                  <div className="flex gap-2">
                    {moodLabels.map((mood) => (
                      <button
                        key={mood.value}
                        onClick={() => setCurrentEntry({ ...currentEntry, mood: mood.value })}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 ${
                          currentEntry.mood === mood.value
                            ? 'border-purple-400 bg-purple-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="text-2xl mb-1">{mood.emoji}</span>
                        <span className="text-xs text-slate-600">{mood.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={saveEntry}
                  disabled={!currentEntry.gratitudes?.some(g => g.trim()) || !currentEntry.reflection?.trim()}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Save className="w-5 h-5 inline mr-2" />
                  {isEditing ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            )}

            {/* Today's Entry Display */}
            {todaysEntry && !isEditing && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-green-800">Today's Entry Complete! 🎉</h3>
                  <button
                    onClick={() => editEntry(todaysEntry)}
                    className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
                <p className="text-green-700">You've successfully recorded your gratitude for today. Keep up the great work!</p>
              </div>
            )}
          </div>

          {/* Previous Entries */}
          <div>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Previous Entries</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {entries.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No entries yet. Start your gratitude journey today!</p>
                </div>
              ) : (
                entries
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((entry) => (
                    <div key={entry.id} className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                          <span className={`text-lg ${moodLabels.find(m => m.value === entry.mood)?.color}`}>
                            {moodLabels.find(m => m.value === entry.mood)?.emoji}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => editEntry(entry)}
                            className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {entry.gratitudes.map((gratitude, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span>{gratitude}</span>
                          </div>
                        ))}
                      </div>
                      
                      {entry.reflection && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-sm text-slate-600 italic">"{entry.reflection}"</p>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200 mt-8">
          <h3 className="text-lg font-semibold text-indigo-800 mb-3">🙏 Benefits of Gratitude Practice</h3>
          <ul className="text-indigo-700 space-y-2 text-sm">
            <li>• Increases overall life satisfaction and happiness</li>
            <li>• Improves sleep quality and reduces stress</li>
            <li>• Strengthens relationships and social connections</li>
            <li>• Boosts immune system and physical health</li>
            <li>• Develops resilience and emotional regulation</li>
            <li>• Shifts focus from what's lacking to what's abundant</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GratitudeJournal;
