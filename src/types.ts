export interface Respondent {
  id: string;
  timestamp: string;
  name: string;
  gender: string;
  education: string;
  answers: { [key: string]: string | number };
}

export interface SurveyData {
  meta: {
    survey_name: string;
    period: string;
    total_respondents: number;
    last_updated: string;
  };
  ikm: {
    score: number;
    category: string;
    label: string;
  };
  indicators: {
    id: number;
    label: string;
    avg: number;
    distribution: number[];
  }[];
  demographics: {
    gender: { [key: string]: number };
    education: { [key: string]: number };
  };
  open_ended: {
    general_opinion: string[];
    expectations: string[];
  };
  respondents?: Respondent[];
}

export type SurveyVisibility = "PRIVATE" | "LINK_ONLY" | "PUBLIC";

export interface SurveyConfig {
  id: string;
  name: string;
  agency: string;
  period: string;
  scriptUrl: string;
  isActive: boolean;
  visibility: SurveyVisibility;
  isPublic?: boolean; 
  createdAt: any;
  createdBy: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "VIEWER";
  isActive: boolean;
}
