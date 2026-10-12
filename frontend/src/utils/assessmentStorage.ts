import { UserProfile } from '../contexts/UserContext';

export interface AssessmentQuestion {
  id: string;
  question: string;
  answer: string | number | boolean | string[];
  category: string;
  timestamp: string;
}

export interface AssessmentData {
  userId: string;
  completedAt: string;
  profile: UserProfile;
  questions: AssessmentQuestion[];
}

// Assessment questions mapping
const ASSESSMENT_QUESTIONS = {
  identity: [
    { id: 'age', question: 'What is your age?', category: 'Identity' },
    { id: 'lifeStage', question: 'What is your current life stage?', category: 'Identity' },
    { id: 'dailyRole', question: 'What is your daily role?', category: 'Identity' }
  ],
  mentalState: [
    { id: 'generalMood', question: 'How would you describe your general mood lately?', category: 'Mental State' },
    { id: 'copingMechanism', question: 'When you\'re stressed, what do you usually turn to?', category: 'Mental State' }
  ],
  lifestyle: [
    { id: 'livingSituation', question: 'What is your living situation?', category: 'Lifestyle' },
    { id: 'carOwnership', question: 'Do you own a car?', category: 'Lifestyle' },
    { id: 'exerciseFrequency', question: 'How often do you exercise?', category: 'Lifestyle' }
  ],
  values: [
    { id: 'currentPriority', question: 'What\'s your current priority in life?', category: 'Values' },
    { id: 'skillToImprove', question: 'What skill would you like to improve?', category: 'Values' }
  ],
  habits: [
    { id: 'spiritualPractice', question: 'Do you have any spiritual practice?', category: 'Habits' },
    { id: 'taskCompletion', question: 'Do you usually complete tasks you set out to do?', category: 'Habits' },
    { id: 'threeWords', question: 'Describe yourself in three words', category: 'Habits' }
  ]
};

export const saveAssessmentData = (profile: UserProfile): void => {
  try {
    const questions: AssessmentQuestion[] = [];
    const timestamp = new Date().toISOString();
    
    // Convert profile data to questions and answers
    Object.entries(ASSESSMENT_QUESTIONS).forEach(([category, categoryQuestions]) => {
      categoryQuestions.forEach(({ id, question, category: cat }) => {
        const answer = (profile as any)[id];
        if (answer !== undefined && answer !== null && answer !== '') {
          questions.push({
            id,
            question,
            answer: typeof answer === 'object' ? JSON.stringify(answer) : answer,
            category: cat,
            timestamp
          });
        }
      });
    });

    const assessmentData: AssessmentData = {
      userId: generateUserId(),
      completedAt: timestamp,
      profile,
      questions
    };

    // Save to localStorage
    const existingData = JSON.parse(localStorage.getItem('zenith-assessments') || '[]');
    existingData.push(assessmentData);
    localStorage.setItem('zenith-assessments', JSON.stringify(existingData, null, 2));

    // Also save as downloadable JSON file
    downloadAssessmentJSON(assessmentData);
    
    console.log('Assessment data saved successfully:', assessmentData);
  } catch (error) {
    console.error('Error saving assessment data:', error);
  }
};

export const getAssessmentHistory = (): AssessmentData[] => {
  try {
    return JSON.parse(localStorage.getItem('zenith-assessments') || '[]');
  } catch (error) {
    console.error('Error loading assessment history:', error);
    return [];
  }
};

const generateUserId = (): string => {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

const downloadAssessmentJSON = (data: AssessmentData): void => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `zenith-ai-assessment-${data.completedAt.split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading assessment JSON:', error);
  }
};

export const formatAssessmentForDisplay = (data: AssessmentData): string => {
  let output = `Zenith AI Assessment Results\n`;
  output += `Completed: ${new Date(data.completedAt).toLocaleString()}\n`;
  output += `User ID: ${data.userId}\n\n`;
  
  output += `Questions and Answers:\n`;
  output += `${'='.repeat(50)}\n\n`;
  
  data.questions.forEach((q, index) => {
    output += `${index + 1}. ${q.question}\n`;
    output += `   Category: ${q.category}\n`;
    output += `   Answer: ${q.answer}\n\n`;
  });
  
  return output;
};
