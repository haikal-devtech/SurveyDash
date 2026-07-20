export interface Respondent {
  id: string;
  timestamp: string;
  name: string;
  gender: string;
  education: string;
  umur?: string;
  pekerjaan?: string;
  penghasilan?: string;
  agama?: string;
  suku?: string;
  afiliasi_politik?: string;
  desa_kota?: string;
  provinsi?: string;
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

// ── SKM Survey Data (existing) ─────────────────────────────────────────────
export interface SurveyData {
  meta: {
    survey_name: string;
    period: string;
    total_respondents: number;
    last_updated: string;
<<<<<<< Updated upstream
    survey_type?: string;
=======
    sample_validity?: string;
    data_mode?: string;
    margin_of_error?: string;
>>>>>>> Stashed changes
  };
  ikm: {
    score: number;
    category: string;
    label: string;
<<<<<<< Updated upstream
  } | null;
=======
    interval?: string;
    gap?: number;
  };
>>>>>>> Stashed changes
  indicators: {
    id: number;
    label: string;
    avg: number;
    distribution: number[];
  }[];
  demographics: {
    gender: { [key: string]: number };
    education?: { [key: string]: number };
    umur?: { [key: string]: number };
    pekerjaan?: { [key: string]: number };
    pendidikan?: { [key: string]: number };
    suku?: { [key: string]: number };
    layanan?: { [key: string]: number };
    location?: { [key: string]: number };
    agama?: { [key: string]: number };
    penghasilan?: { [key: string]: number };
    afiliasi_politik?: { [key: string]: number };
    desa_kota?: { [key: string]: number };
    provinsi?: { [key: string]: number };
  };
  open_ended: {
    general_opinion: string[];
    expectations: string[];
  };
  respondents?: Respondent[];
<<<<<<< Updated upstream

  // Electoral fields (present when survey_type === 'ELECTORAL')
  national_leadership?: NationalLeadership;
  electability?: Electability;
  party?: PartyData;
  gov_performance?: GovPerformance;
  voter_behavior?: VoterBehavior;
  public_emotion?: PublicEmotion;
  surveyor_quality?: SurveyorQuality;
=======
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
>>>>>>> Stashed changes
}

// ── Electoral shared types ─────────────────────────────────────────────────
export interface ScaleResult {
  avg: number;
  dist: { [score: string]: number };
}

export interface LabelScaleResult {
  avg: number;
  dist: { [label: string]: number };
}

// ── Electoral sections ─────────────────────────────────────────────────────
export interface NationalLeadership {
  a1b_satisfaction: ScaleResult;
  a1c_optimism: ScaleResult;
  a1d_problems: { [option: string]: number };
  a2e_character: { [option: string]: number };
  a2f_new_leader: { [option: string]: number };
  a2g_background: { [option: string]: number };
  open: {
    a1a: string[];
    a2a: string[];
    a2b: string[];
    a2c: string[];
    a2d: string[];
    a2h: string[];
    a2i: string[];
    a2j_ekonomi: string[];
    a2j_korupsi: string[];
    a2j_diplomasi: string[];
    a2j_pertahanan: string[];
    a2j_kesra: string[];
  };
}

export interface Electability {
  awareness: { [candidate: string]: number };
  likability: { [candidate: string]: number };
  vote_intention: { [candidate: string]: number };
  simulation: {
    s10: { [candidate: string]: number };
    s8: { [candidate: string]: number };
    s5: { [candidate: string]: number };
    klaster_politisi: { [candidate: string]: number };
    klaster_tokoh: { [candidate: string]: number };
    klaster_profesional: { [candidate: string]: number };
  };
  open: {
    b1a: string[];
    b1b: string[];
    b1c: string[];
    b1d: string[];
  };
}

export interface PartyData {
  awareness: { [party: string]: number };
  likability: { [party: string]: number };
  vote_intention: { [party: string]: number };
  open_e1a: string[];
}

export interface GovPerformance {
  f2_satisfaction?: { [sector: string]: LabelScaleResult };
  f3_leadership: { [aspect: string]: ScaleResult };
  f4_trust: { [aspect: string]: ScaleResult };
  f5b_score: ScaleResult;
  open: {
    f1a: string[];
    f5a: string[];
    f5c: string[];
    f5d: string[];
    f5e: string[];
  };
}

export interface VoterBehavior {
  g1b: { [factor: string]: number };
  g2_campaign: { [method: string]: LabelScaleResult };
  g3_factors: { [factor: string]: LabelScaleResult };
  g4_influence: { [influencer: string]: LabelScaleResult };
  open_g1a: string[];
}

export interface LeaderSentiment {
  opinion: string[];
  liked: string[];
  disliked: string[];
  action: string[];
}

export interface PublicEmotion {
  h1: { [leader: string]: LeaderSentiment };
  h2_trust: { [leader: string]: ScaleResult };
}

export interface SurveyorQuality {
  i1a_understanding: { [option: string]: number };
  i1b_reliability: { [option: string]: number };
}

// ── Survey config ──────────────────────────────────────────────────────────
export type SurveyVisibility = "PRIVATE" | "LINK_ONLY" | "PUBLIC";
export type SurveyType = "SKM" | "ELECTORAL";

export interface SamplingConfig {
  confidenceLevel: number;   // e.g. 95 (%)
  populationSize: number;    // N
  marginOfError: number;     // e decimal, e.g. 0.0221
  targetRespondents: number; // calculated n = N / (1 + N*e²)
  samplingMethod: string;    // e.g. "Accidental Sampling"
}

export interface SurveyConfig {
  id: string;
  name: string;
  subtitle?: string;
  agency: string;
  period: string;
  scriptUrl: string;
  isActive: boolean;
  visibility: SurveyVisibility;
<<<<<<< Updated upstream
  surveyType?: SurveyType;
  isPublic?: boolean;
  createdAt: any;
  createdBy: string;
  samplingConfig?: SamplingConfig;
=======
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
>>>>>>> Stashed changes
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
