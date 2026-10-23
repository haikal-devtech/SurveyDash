import type { Question } from './types';
export interface SurveyorProfile {
  userId: string;
  username: string;
  fullName: string;
  provinceId?: string | null;
  bankName: string;
  accountName: string;
  accountLast4: string;
  consentAt: string;
  updatedAt: string;
}
export interface SurveyorAssignment {
  acceptedCount?: number;
  target?: number | null;
  city?: string;
  district?: string;
  id: string;
  surveyId: string;
  title: string;
  institution: string;
  status: 'draft' | 'open' | 'closed';
  active: boolean;
  provinceId?: string | null;
  shareUrl: string;
  responseCount: number;
  questions: Question[];
}
export interface ManagedSurveyorAssignment {
  surveyorId?: string;
  blocked?: boolean;
  acceptedCount?: number;
  id: string;
  username: string;
  fullName: string;
  active: boolean;
  provinceId?: string | null;
  shareUrl: string;
  responseCount: number;
  createdAt: string;
}
export interface SurveyorAttribution {
  provinceId?: string | null;
  assignmentId: string;
  surveyorId: string;
  username: string;
  fullName: string;
}
export interface ProvinceTarget {
  provinceId: string;
  target: number;
}
export interface SurveyorTeamGroup {
  provinceResponses?: { provinceId: string | null; count: number }[];
  dataset?: 'all' | 'accepted';
  surveyId: string;
  title: string;
  responseCount: number;
  provinceTargets: ProvinceTarget[];
  assignments: ManagedSurveyorAssignment[];
}
