import { ModelError } from './model';
export interface PlanUsage {
  responses: number;
  activeSurveys: number;
  totalSurveys: number;
  responseLimit: number | null;
  activeLimit: number | null;
  period: string;
  simulatedResponses: number;
}
export function assertCapacity(current: number, limit: number | null, resource: string) {
  if (limit !== null && current >= limit)
    throw new ModelError(`Batas ${resource} tercapai. Data yang sudah ada tetap tersimpan.`);
}
export function configuredLimits() {
  const enabled = process.env.ENFORCE_FREE_LIMITS === 'true';
  const safeLimit = (value: string | undefined, fallback: number) => {
    const number = Number(value ?? fallback);
    return Number.isSafeInteger(number) && number > 0 ? number : fallback;
  };
  return {
    responseLimit: enabled ? safeLimit(process.env.FREE_RESPONSE_LIMIT, 100) : null,
    activeLimit: enabled ? safeLimit(process.env.FREE_ACTIVE_SURVEY_LIMIT, 3) : null,
  };
}
