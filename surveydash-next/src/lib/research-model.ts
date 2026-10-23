export interface CrossTab {
  rows: string[];
  columns: string[];
  cells: { count: number; weighted: number; percent: number }[][];
  total: number;
  paired: number;
  weightedTotal: number;
  weighted: boolean;
  dataset: 'all' | 'accepted';
}
