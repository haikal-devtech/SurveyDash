export interface FieldworkRow {
  assignmentId: string;
  surveyId: string;
  survey: string;
  name: string;
  username: string;
  provinceId: string | null;
  active: boolean;
  city: string;
  district: string;
  coordinatorId: string | null;
  coordinatorName: string;
  target: number | null;
  all: number;
  accepted: number;
  held: number;
  excluded: number;
  lastResponse: string | null;
  paymentAmount?: number;
  paymentStatus?: 'pending' | 'paid';
}
export interface FieldworkData {
  rows: FieldworkRow[];
  coordinators: { id: string; name: string }[];
}
