import type { SurveyConfig } from "@/types";

const STORAGE_PREFIX = "survey-dashboard-config:";

export type MarginErrorMode = "slovin" | "manual";
export type IndexScoreMode = "auto" | "manual";
export type GapMode = "auto" | "manual";
export type QualityMode = "auto" | "manual";

export interface SurveyDashboardConfig {
  surveyId: string;
  title: string;
  institution: string;
  period: string;
  population: number;
  totalRespondents: number;
  confidenceLevel: number;
  marginErrorMode: MarginErrorMode;
  manualMarginOfError: string;
  indexScoreMode: IndexScoreMode;
  manualIndexScore: number;
  targetScore: number;
  gapMode: GapMode;
  manualGap: number;
  qualityMode: QualityMode;
  manualQualityLabel: string;
  manualQualityCategory: string;
  manualQualityInterval: string;
  participationRate: string;
  reliabilityIndex: number;
  trend: string;
  sampleValidity: string;
  presentationMode?: boolean;
}

export interface ResolvedSurveyDashboard {
  marginOfError: string;
  participationRate: string;
  reliabilityIndex: number;
  trend: string;
  totalRespondents: number;
  sampleValidity: string;
  indexScore: number;
  qualityLabel: string;
  qualityCategory: string;
  qualityInterval: string;
  targetScore: number;
  gap: number;
  title: string;
  institution: string;
  period: string;
}

// ─── Known Survey Defaults ──────────────────────────────────────────────────

const SURNAS_DEFAULT: SurveyDashboardConfig = {
  surveyId: "surnas-kepemimpinan-2026",
  title: "Kepemimpinan dan Peta Politik Nasional",
  institution: "LSIN",
  period: "14-23 Juni 2026",
  population: 289716110,
  totalRespondents: 400,
  confidenceLevel: 95,
  marginErrorMode: "slovin",
  manualMarginOfError: "±5.00%",
  indexScoreMode: "manual",
  manualIndexScore: 76.31,
  targetScore: 90.00,
  gapMode: "auto",
  manualGap: 13.69,
  qualityMode: "auto",
  manualQualityLabel: "C",
  manualQualityCategory: "Kurang Baik",
  manualQualityInterval: "65,00–76,60",
  participationRate: "94%",
  reliabilityIndex: 0.89,
  trend: "+4.2%",
  sampleValidity: "95%",
};

const SKM_BPBD_DEFAULT: SurveyDashboardConfig = {
  surveyId: "skm-bpbd-tangsel-2026",
  title: "SKM BPBD KOTA TANGERANG SELATAN",
  institution: "Sekretariat Daerah",
  period: "Triwulan 1 2026",
  population: 0,
  totalRespondents: 380,
  confidenceLevel: 95,
  marginErrorMode: "manual",
  manualMarginOfError: "±2.5%",
  indexScoreMode: "manual",
  manualIndexScore: 88.44,
  targetScore: 90.00,
  gapMode: "auto",
  manualGap: 1.56,
  qualityMode: "auto",
  manualQualityLabel: "A",
  manualQualityCategory: "Sangat Baik",
  manualQualityInterval: "88,31–100",
  participationRate: "94%",
  reliabilityIndex: 0.89,
  trend: "+4.2%",
  sampleValidity: "95%",
};

const FALLBACK_DEFAULT: Omit<SurveyDashboardConfig, "surveyId"> = {
  title: "",
  institution: "",
  period: "",
  population: 0,
  totalRespondents: 0,
  confidenceLevel: 95,
  marginErrorMode: "manual",
  manualMarginOfError: "±0.00%",
  indexScoreMode: "manual",
  manualIndexScore: 0,
  targetScore: 90.00,
  gapMode: "auto",
  manualGap: 0,
  qualityMode: "auto",
  manualQualityLabel: "D",
  manualQualityCategory: "Tidak Baik",
  manualQualityInterval: "0–64,99",
  participationRate: "0%",
  reliabilityIndex: 0,
  trend: "0%",
  sampleValidity: "0%",
};

export const DEFAULT_SURVEY_DASHBOARD_CONFIGS: Record<string, SurveyDashboardConfig> = {
  "surnas-kepemimpinan-2026": SURNAS_DEFAULT,
  "skm-bpbd-tangsel-2026": SKM_BPBD_DEFAULT,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export function calculateSlovinMarginError(population: number, sample: number) {
  if (!population || !sample || population <= 0 || sample <= 0) {
    return { decimal: 0, percentage: 0, label: "±0.00%" };
  }
  const e = Math.sqrt(((population / sample) - 1) / population);
  const percentage = Number((e * 100).toFixed(2));
  return {
    decimal: Number(e.toFixed(4)),
    percentage,
    label: `±${percentage.toFixed(2)}%`,
  };
}

export function calculateAutomaticIndexScore(indicators: { avg: number }[]): number {
  if (!indicators || indicators.length === 0) return 0;
  const sum = indicators.reduce((acc, ind) => acc + ind.avg, 0);
  const avg = sum / indicators.length;
  return Number(((avg / 4) * 100).toFixed(2));
}

export function calculateGap(targetScore: number, indexScore: number): number {
  return Number((targetScore - indexScore).toFixed(2));
}

export function getQualityByScore(score: number) {
  if (score >= 88.31) return { label: "A", category: "Sangat Baik", interval: "88,31–100" };
  if (score >= 76.61) return { label: "B", category: "Baik", interval: "76,61–88,30" };
  if (score >= 65.00) return { label: "C", category: "Kurang Baik", interval: "65,00–76,60" };
  return { label: "D", category: "Tidak Baik", interval: "0–64,99" };
}

// ─── Normalization ───────────────────────────────────────────────────────────

export function normalizeSurveyDashboardConfig(
  surveyId: string,
  raw: Partial<SurveyDashboardConfig>
): SurveyDashboardConfig {
  const base = DEFAULT_SURVEY_DASHBOARD_CONFIGS[surveyId] ?? {
    ...FALLBACK_DEFAULT,
    surveyId,
    title: raw.title ?? surveyId,
    institution: raw.institution ?? "",
    period: raw.period ?? "",
  };
  return { ...base, ...raw, surveyId };
}

// ─── Storage CRUD ─────────────────────────────────────────────────────────────

export function getSurveyDashboardConfig(surveyId: string): SurveyDashboardConfig {
  if (!surveyId) return { ...FALLBACK_DEFAULT, surveyId: "unknown" };
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${surveyId}`);
    if (!stored) {
      return DEFAULT_SURVEY_DASHBOARD_CONFIGS[surveyId]
        ? { ...DEFAULT_SURVEY_DASHBOARD_CONFIGS[surveyId] }
        : { ...FALLBACK_DEFAULT, surveyId };
    }
    return normalizeSurveyDashboardConfig(surveyId, JSON.parse(stored));
  } catch {
    return DEFAULT_SURVEY_DASHBOARD_CONFIGS[surveyId]
      ? { ...DEFAULT_SURVEY_DASHBOARD_CONFIGS[surveyId] }
      : { ...FALLBACK_DEFAULT, surveyId };
  }
}

export function saveSurveyDashboardConfig(surveyId: string, config: SurveyDashboardConfig): void {
  localStorage.setItem(`${STORAGE_PREFIX}${surveyId}`, JSON.stringify({ ...config, surveyId }));
}

export function resetSurveyDashboardConfig(surveyId: string): SurveyDashboardConfig {
  localStorage.removeItem(`${STORAGE_PREFIX}${surveyId}`);
  return DEFAULT_SURVEY_DASHBOARD_CONFIGS[surveyId]
    ? { ...DEFAULT_SURVEY_DASHBOARD_CONFIGS[surveyId] }
    : { ...FALLBACK_DEFAULT, surveyId };
}

// ─── Resolution ───────────────────────────────────────────────────────────────

export function resolveSurveyDashboard(
  cfg: SurveyDashboardConfig,
  liveIndicators?: { avg: number }[]
): ResolvedSurveyDashboard {
  // Margin of Error
  const marginOfError =
    cfg.marginErrorMode === "slovin"
      ? calculateSlovinMarginError(cfg.population, cfg.totalRespondents).label
      : cfg.manualMarginOfError;

  // Index Score
  const indexScore =
    cfg.indexScoreMode === "auto" && liveIndicators && liveIndicators.length > 0
      ? calculateAutomaticIndexScore(liveIndicators)
      : cfg.manualIndexScore;

  // Gap
  const gap =
    cfg.gapMode === "auto"
      ? calculateGap(cfg.targetScore, indexScore)
      : cfg.manualGap;

  // Quality
  const quality =
    cfg.qualityMode === "auto"
      ? getQualityByScore(indexScore)
      : {
          label: cfg.manualQualityLabel,
          category: cfg.manualQualityCategory,
          interval: cfg.manualQualityInterval,
        };

  return {
    marginOfError,
    participationRate: cfg.participationRate,
    reliabilityIndex: cfg.reliabilityIndex,
    trend: cfg.trend,
    totalRespondents: cfg.totalRespondents,
    sampleValidity: cfg.sampleValidity,
    indexScore,
    qualityLabel: quality.label,
    qualityCategory: quality.category,
    qualityInterval: quality.interval,
    targetScore: cfg.targetScore,
    gap,
    title: cfg.title,
    institution: cfg.institution,
    period: cfg.period,
  };
}

// ─── Build config from Firestore SurveyConfig ─────────────────────────────────
// Firestore is the authoritative source; localStorage is only a fallback cache.

export function buildConfigFromSurvey(survey: SurveyConfig): SurveyDashboardConfig {
  const known = DEFAULT_SURVEY_DASHBOARD_CONFIGS[survey.id];
  return {
    surveyId: survey.id,
    title: survey.name,
    institution: survey.agency,
    period: survey.period,
    population: survey.population ?? known?.population ?? 0,
    totalRespondents: survey.totalRespondents ?? known?.totalRespondents ?? 0,
    confidenceLevel: survey.confidenceLevel ?? known?.confidenceLevel ?? 95,
    marginErrorMode: survey.marginErrorMode ?? known?.marginErrorMode ?? "manual",
    manualMarginOfError: survey.manualMarginOfError ?? known?.manualMarginOfError ?? "±0.00%",
    indexScoreMode: survey.indexScoreMode ?? known?.indexScoreMode ?? "auto",
    manualIndexScore: survey.manualIndexScore ?? known?.manualIndexScore ?? 0,
    targetScore: survey.targetScore ?? known?.targetScore ?? 90,
    gapMode: survey.gapMode ?? known?.gapMode ?? "auto",
    manualGap: survey.manualGap ?? known?.manualGap ?? 0,
    qualityMode: survey.qualityMode ?? known?.qualityMode ?? "auto",
    manualQualityLabel: survey.manualQualityLabel ?? known?.manualQualityLabel ?? "D",
    manualQualityCategory: survey.manualQualityCategory ?? known?.manualQualityCategory ?? "Tidak Baik",
    manualQualityInterval: survey.manualQualityInterval ?? known?.manualQualityInterval ?? "0–64,99",
    participationRate: survey.participationRate ?? known?.participationRate ?? "0%",
    reliabilityIndex: survey.reliabilityIndex ?? known?.reliabilityIndex ?? 0,
    trend: survey.trend ?? known?.trend ?? "0%",
    sampleValidity: survey.sampleValidity ?? known?.sampleValidity ?? "0%",
    presentationMode: survey.presentationMode ?? false,
  };
}
