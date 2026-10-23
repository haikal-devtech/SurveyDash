import { getDb } from './db';
export type Dataset = 'all' | 'accepted';
export function datasetCondition(alias = 's') {
  return `EXISTS (SELECT 1 FROM cleaning_reviews qr WHERE qr.submission_id = ${alias}.id AND qr.survey_id = ${alias}.survey_id AND qr.revision = ${alias}.revision AND qr.status = 'valid')`;
}
export async function responseQuality(surveyId: string) {
  const row = await getDb()
    .prepare(
      `SELECT count(*) AS total,
    COALESCE(SUM(CASE WHEN r.status = 'valid' THEN 1 ELSE 0 END),0) AS accepted,
    COALESCE(SUM(CASE WHEN r.status = 'needs_verification' THEN 1 ELSE 0 END),0) AS held,
    COALESCE(SUM(CASE WHEN r.status = 'excluded' THEN 1 ELSE 0 END),0) AS excluded
    FROM submissions s LEFT JOIN cleaning_reviews r ON r.submission_id = s.id AND r.survey_id = s.survey_id AND r.revision = s.revision WHERE s.survey_id = ?`,
    )
    .get(surveyId);
  const all = Number(row.total),
    accepted = Number(row.accepted),
    held = Number(row.held),
    excluded = Number(row.excluded);
  return { all, accepted, held, excluded, unreviewed: all - accepted - held - excluded };
}
