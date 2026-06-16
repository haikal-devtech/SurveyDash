const STORAGE_KEY = "dashboard_summary_config";

export interface DashboardSummaryConfig {
  population: number;
  totalRespondents: number;
  confidenceLevel: number;
  participationRate: string;
  reliabilityIndex: number;
  trend: string;
  sampleValidity: string;
  indexScore: number;
  targetScore: number;
  useManualOverride: boolean;
  manualMarginOfError: string;
  manualGap: number;
  manualQualityLabel: string;
  manualQualityCategory: string;
  manualQualityInterval: string;
}

export const DEFAULT_DASHBOARD_SUMMARY_CONFIG: DashboardSummaryConfig = {
  population: 289716110,
  totalRespondents: 400,
  confidenceLevel: 95,
  participationRate: "94%",
  reliabilityIndex: 0.89,
  trend: "+4.2%",
  sampleValidity: "95%",
  indexScore: 76.31,
  targetScore: 90.00,
  useManualOverride: false,
  manualMarginOfError: "±5.00%",
  manualGap: 13.69,
  manualQualityLabel: "C",
  manualQualityCategory: "Kurang Baik",
  manualQualityInterval: "65,00–76,60",
};

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

export function calculateGap(targetScore: number, indexScore: number) {
  return Number((targetScore - indexScore).toFixed(2));
}

export function getQualityByScore(score: number) {
  if (score >= 88.31) {
    return { label: "A", category: "Sangat Baik", interval: "88,31–100" };
  }
  if (score >= 76.61) {
    return { label: "B", category: "Baik", interval: "76,61–88,30" };
  }
  if (score >= 65.00) {
    return { label: "C", category: "Kurang Baik", interval: "65,00–76,60" };
  }
  return { label: "D", category: "Tidak Baik", interval: "0–64,99" };
}

export function normalizeDashboardSummaryConfig(raw: Partial<DashboardSummaryConfig>): DashboardSummaryConfig {
  return {
    ...DEFAULT_DASHBOARD_SUMMARY_CONFIG,
    ...raw,
  };
}

export function getDashboardSummaryConfig(): DashboardSummaryConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_DASHBOARD_SUMMARY_CONFIG };
    return normalizeDashboardSummaryConfig(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_DASHBOARD_SUMMARY_CONFIG };
  }
}

export function saveDashboardSummaryConfig(config: DashboardSummaryConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function resetDashboardSummaryConfig(): DashboardSummaryConfig {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_DASHBOARD_SUMMARY_CONFIG };
}

export interface ResolvedDashboardSummary {
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
}

export function resolveDashboardSummary(config: DashboardSummaryConfig): ResolvedDashboardSummary {
  const marginOfError = config.useManualOverride
    ? config.manualMarginOfError
    : calculateSlovinMarginError(config.population, config.totalRespondents).label;

  const gap = config.useManualOverride
    ? config.manualGap
    : calculateGap(config.targetScore, config.indexScore);

  const quality = config.useManualOverride
    ? { label: config.manualQualityLabel, category: config.manualQualityCategory, interval: config.manualQualityInterval }
    : getQualityByScore(config.indexScore);

  return {
    marginOfError,
    participationRate: config.participationRate,
    reliabilityIndex: config.reliabilityIndex,
    trend: config.trend,
    totalRespondents: config.totalRespondents,
    sampleValidity: config.sampleValidity,
    indexScore: config.indexScore,
    qualityLabel: quality.label,
    qualityCategory: quality.category,
    qualityInterval: quality.interval,
    targetScore: config.targetScore,
    gap,
  };
}
