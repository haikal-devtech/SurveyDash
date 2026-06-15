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
}

// ── SKM Survey Data (existing) ─────────────────────────────────────────────
export interface SurveyData {
  meta: {
    survey_name: string;
    period: string;
    total_respondents: number;
    last_updated: string;
    survey_type?: string;
  };
  ikm: {
    score: number;
    category: string;
    label: string;
  } | null;
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

  // Electoral fields (present when survey_type === 'ELECTORAL')
  national_leadership?: NationalLeadership;
  electability?: Electability;
  party?: PartyData;
  gov_performance?: GovPerformance;
  voter_behavior?: VoterBehavior;
  public_emotion?: PublicEmotion;
  surveyor_quality?: SurveyorQuality;
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
  f2_satisfaction: { [sector: string]: LabelScaleResult };
  f3_leadership: { [aspect: string]: ScaleResult };
  f4_trust: { [aspect: string]: ScaleResult };
  f5b_score: ScaleResult;
  open: {
    f1a: string[];
    f1b: string[];
    f1c: string[];
    f5a: string[];
    f5c: string[];
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
  agency: string;
  period: string;
  scriptUrl: string;
  isActive: boolean;
  visibility: SurveyVisibility;
  surveyType?: SurveyType;
  isPublic?: boolean;
  createdAt: any;
  createdBy: string;
  samplingConfig?: SamplingConfig;
}

export interface UserProfile {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "VIEWER";
  isActive: boolean;
}
