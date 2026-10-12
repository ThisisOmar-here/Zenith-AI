import React from 'react';
import { UserProfile } from '../../contexts/UserContext';

export interface AssessmentStepProps {
  profile: Partial<UserProfile>;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const AssessmentStep: React.FC<AssessmentStepProps> = ({ profile, updateProfile }) => {
  return (
    <div className="space-y-6">
      {/* This is a base component - individual steps will implement their own UI */}
    </div>
  );
};

export default AssessmentStep;
