'use client';
import { useEffect, useState } from 'react';
import type { Survey, SurveyInsights } from '@/lib/types';
import type { QuestionBreakdown } from '@/lib/analytics-model';
export function useChartSource(survey: Survey, sourceId: string, provided?: SurveyInsights) {
  const [overview, setOverview] = useState<{ surveyId: string; data?: SurveyInsights; error?: string }>();
  const [breakdown, setBreakdown] = useState<{
    sourceId: string;
    reference: SurveyInsights;
    data?: QuestionBreakdown;
    error?: string;
  }>();
  const insights = provided ?? (overview?.surveyId === survey.id ? overview.data : undefined);
  const question = survey.questions.find((q) => q.id === sourceId);
  const enabled = !!sourceId;
  const needsBreakdown = !!question && !question.options.length;
  useEffect(() => {
    if (provided || !enabled) return;
    const controller = new AbortController();
    fetch(`/api/surveys/${survey.id}/insights`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw Error(data.error ?? 'Data belum dapat dimuat.');
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted) setOverview({ surveyId: survey.id, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setOverview({ surveyId: survey.id, error: error.message });
      });
    return () => controller.abort();
  }, [survey.id, provided, enabled]);
  useEffect(() => {
    if (!needsBreakdown || !insights) return;
    const reference = insights;
    const controller = new AbortController();
    fetch(`/api/surveys/${survey.id}/insights?questionId=${encodeURIComponent(sourceId)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw Error(data.error ?? 'Distribusi belum dapat dimuat.');
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted) setBreakdown({ sourceId, reference, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setBreakdown({ sourceId, reference, error: error.message });
      });
    return () => controller.abort();
  }, [survey.id, sourceId, needsBreakdown, insights]);
  const result = breakdown?.sourceId === sourceId && breakdown.reference === insights ? breakdown : undefined;
  return {
    insights,
    question,
    data:
      sourceId === '__timeline'
        ? (insights?.timeline?.points ?? [])
        : needsBreakdown
          ? (result?.data?.rows ?? [])
          : (insights?.questions[sourceId]?.distribution ?? []),
    loading: !!sourceId && (!insights || (needsBreakdown && !result)),
    error: overview?.surveyId === survey.id ? (overview.error ?? result?.error) : result?.error,
    unavailable: result?.data?.unavailable,
    note:
      sourceId === '__timeline'
        ? `Jumlah respons per ${insights?.timeline?.intervalDays ?? 1} hari · WIB`
        : (result?.data?.note ??
          (question?.type === 'checkbox'
            ? 'Persentase dihitung dari seluruh pilihan.'
            : 'Persentase dihitung dari jawaban yang terisi.')),
    answered: question ? (insights?.questions[question.id]?.answered ?? 0) : (insights?.stats.total ?? 0),
    unit: question?.type === 'checkbox' ? 'pilihan' : 'jawaban',
  };
}
