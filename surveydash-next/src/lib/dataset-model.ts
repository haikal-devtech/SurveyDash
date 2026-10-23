export interface DatasetVersion {
  id: string;
  name: string;
  dataset: 'all' | 'accepted';
  count: number;
  methodNotes: string;
  createdAt: string;
}
