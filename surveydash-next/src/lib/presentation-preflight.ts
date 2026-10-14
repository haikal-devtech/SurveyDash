import type { Survey, SurveyInsights } from './types';
import type { SlideSection } from './presentation-model';

export interface PreflightItem {
  section: SlideSection;
  title: string;
  status: 'ready' | 'missing' | 'unavailable';
  detail: string;
}
export function presentationPreflight(
  survey: Survey,
  insights: SurveyInsights,
  sections: SlideSection[],
): PreflightItem[] {
  const result: PreflightItem[] = [];
  if (sections.includes('summary'))
    result.push({
      section: 'summary',
      title: 'Ringkasan',
      status: insights.stats.total ? 'ready' : 'missing',
      detail: insights.stats.total + ' respons dari target ' + survey.target + '.',
    });
  if (sections.includes('demographic')) {
    const question =
      survey.questions.find(
        (q) => ['gender', 'region', 'age', 'education', 'occupation'].includes(q.id) && q.options.length,
      ) ?? survey.questions.find((q) => q.type === 'choice' && !q.scored);
    const answered = question ? (insights.questions[question.id]?.answered ?? 0) : 0;
    result.push({
      section: 'demographic',
      title: 'Profil responden',
      status: question ? (answered ? 'ready' : 'missing') : 'unavailable',
      detail: question
        ? question.label + ': ' + answered + ' jawaban.'
        : 'Belum ada pertanyaan profil yang dapat digrafikkan.',
    });
  }
  if (sections.includes('ikm')) {
    const available = insights.stats.indicators.filter((item) => item.answered > 0).length;
    result.push({
      section: 'ikm',
      title: 'IKM',
      status: survey.kind !== 'skm' ? 'unavailable' : insights.stats.ikm === null ? 'missing' : 'ready',
      detail:
        survey.kind !== 'skm'
          ? 'IKM hanya tersedia pada survei SKM.'
          : insights.stats.ikm === null
            ? available + ' dari 9 unsur memiliki jawaban valid; IKM belum dapat dihitung.'
            : 'IKM ' + insights.stats.ikm.toFixed(2) + ' · Mutu ' + insights.stats.grade + '.',
    });
  }
  if (sections.includes('charts')) {
    const questions = survey.questions.filter((q) => q.options.length).slice(0, 30);
    const ready = questions.filter((q) => (insights.questions[q.id]?.answered ?? 0) > 0).length;
    result.push({
      section: 'charts',
      title: 'Grafik',
      status: !questions.length ? 'unavailable' : ready < questions.length ? 'missing' : 'ready',
      detail: ready + ' dari ' + questions.length + ' grafik memiliki jawaban. Grafik kosong akan ditandai.',
    });
  }
  return result;
}
