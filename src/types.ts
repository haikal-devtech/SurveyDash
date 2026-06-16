export interface Respondent {
  id: string;
  timestamp: string;
  name: string;
  gender: string;
  education: string;
  answers: { [key: string]: string | number };
  documentation?: string | null;
  surveyor?: string | null;
  location?: string | null;
  province?: string | null;
  score_average?: number;
  raw_answers?: Record<string, any>;
}

export interface CandidateRankItem {
  name: string;
  label?: string;
  count?: number;
  percentage?: number | string;
  party?: string;
}

export interface SurveyData {
  meta: {
    survey_name: string;
    period: string;
    total_respondents: number;
    last_updated: string;
    sample_validity?: string;
    data_mode?: string;
    margin_of_error?: string;
  };
  ikm: {
    score: number;
    category: string;
    label: string;
    interval?: string;
    gap?: number;
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
    umur?: { [key: string]: number };
    pekerjaan?: { [key: string]: number };
    suku?: { [key: string]: number };
    layanan?: { [key: string]: number };
    location?: { [key: string]: number };
  };
  open_ended: {
    general_opinion: string[];
    expectations: string[];
  };
  respondents?: Respondent[];
  candidate_preference?: {
    capres?: CandidateRankItem[];
    capres_alternative?: CandidateRankItem[];
    capres_closed?: CandidateRankItem[];
    simulation_10?: CandidateRankItem[];
    simulation_8?: CandidateRankItem[];
    simulation_5?: CandidateRankItem[];
    politisi?: CandidateRankItem[];
    tokoh?: CandidateRankItem[];
    profesional?: CandidateRankItem[];
    parpol?: CandidateRankItem[];
    parpol_closed?: CandidateRankItem[];
  };
  question_analysis?: {
    national_leadership?: Record<string, any>;
    leader_figures?: Record<string, any>;
    presidential_electability?: Record<string, any>;
    presidential_simulation?: Record<string, any>;
    party_electability?: Record<string, any>;
    government_performance?: Record<string, any>;
    voter_behavior?: Record<string, any>;
    public_emotion?: Record<string, any>;
    surveyor_validation?: Record<string, any>;
  };
}

export type SurveyVisibility = "PRIVATE" | "LINK_ONLY" | "PUBLIC";

export interface SurveyConfig {
  id: string;
  name: string;
  subtitle?: string;
  agency: string;
  period: string;
  scriptUrl: string;
  isActive: boolean;
  visibility: SurveyVisibility;
  isPublic?: boolean;
  createdAt: any;
  createdBy: string;
  // Dashboard & formula config (stored in Firestore, authoritative source)
  population?: number;
  totalRespondents?: number;
  confidenceLevel?: number;
  marginErrorMode?: "slovin" | "manual";
  manualMarginOfError?: string;
  participationRate?: string;
  reliabilityIndex?: number;
  trend?: string;
  sampleValidity?: string;
  indexScoreMode?: "auto" | "manual";
  manualIndexScore?: number;
  targetScore?: number;
  gapMode?: "auto" | "manual";
  manualGap?: number;
  qualityMode?: "auto" | "manual";
  manualQualityLabel?: string;
  manualQualityCategory?: string;
  manualQualityInterval?: string;
  presentationMode?: boolean;
  slideVisibility?: SlideVisibility;
}

export interface SlideVisibility {
  summary: boolean;
  indicators: boolean;
  demographics: boolean;
  publicExpectation: boolean;
  respondents: boolean;
  nationalLeadership: boolean;
  leaderFigures: boolean;
  presidentialElectability: boolean;
  presidentialSimulation: boolean;
  partyElectability: boolean;
  governmentPerformance: boolean;
  voterBehavior: boolean;
  publicEmotion: boolean;
  surveyorValidation: boolean;
  rawData: boolean;
}

export const DEFAULT_SLIDE_VISIBILITY: SlideVisibility = {
  summary: true,
  indicators: true,
  demographics: true,
  publicExpectation: true,
  respondents: true,
  nationalLeadership: true,
  leaderFigures: true,
  presidentialElectability: true,
  presidentialSimulation: true,
  partyElectability: true,
  governmentPerformance: true,
  voterBehavior: true,
  publicEmotion: true,
  surveyorValidation: true,
  rawData: false,
};

export interface UserProfile {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "VIEWER";
  isActive: boolean;
}
