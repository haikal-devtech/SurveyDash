import type { Question } from './types';
import { categoryChartTypes, trendChartTypes, type DataChartType } from './chart-types';
export interface ChartSelection {
  sourceId: string;
  type: DataChartType;
  title: string;
}
export function chartTypesForSource(sourceId: string) {
  return sourceId === '__timeline' ? trendChartTypes : categoryChartTypes;
}
export function defaultChartType(question?: Question): DataChartType {
  return !question
    ? 'area'
    : question.scored || ['rating', 'number'].includes(question.type)
      ? 'column'
      : question.options.length > 1 && question.options.length <= 4
        ? 'donut'
        : 'bar';
}
export function chartSelection(
  sourceId: string,
  question: Question | undefined,
  previousType?: DataChartType,
): ChartSelection {
  const types = chartTypesForSource(sourceId);
  return {
    sourceId,
    type:
      previousType && (types as readonly string[]).includes(previousType)
        ? previousType
        : defaultChartType(question),
    title: question?.label ?? 'Tren respons',
  };
}
