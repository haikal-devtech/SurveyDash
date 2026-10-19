import type { Question } from './types';
export interface SurveyorProfile {
  userId: string;
  username: string;
  fullName: string;
  bankName: string;
  accountName: string;
  accountLast4: string;
  consentAt: string;
  updatedAt: string;
}
export interface SurveyorAssignment {
  id: string;
  surveyId: string;
  title: string;
  institution: string;
  status: 'draft' | 'open' | 'closed';
  active: boolean;
  shareUrl: string;
  responseCount: number;
  questions: Question[];
}
export interface ManagedSurveyorAssignment {
  id: string;
  username: string;
  fullName: string;
  active: boolean;
  shareUrl: string;
  responseCount: number;
  createdAt: string;
}
export interface SurveyorAttribution {
  assignmentId: string;
  surveyorId: string;
  username: string;
  fullName: string;
}
