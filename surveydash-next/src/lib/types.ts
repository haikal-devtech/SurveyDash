export type QuestionType = 'text' | 'textarea' | 'choice' | 'checkbox' | 'rating' | 'number' | 'date';
export type Answer = string | string[] | number;
export interface Option {
  id: string;
  label: string;
  score?: number;
}
export interface Question {
  id: string;
  label: string;
  description: string;
  type: QuestionType;
  required: boolean;
  options: Option[];
  scored: boolean;
}
export type WidgetType = 'pie' | 'bar' | 'table' | 'metric' | 'text';
export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  questionId?: string;
  content?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Survey {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  institution: string;
  status: 'draft' | 'open' | 'closed';
  visibility: 'public' | 'link' | 'private';
  kind: 'skm' | 'custom';
  token: string;
  questions: Question[];
  widgets: Widget[];
  version: number;
  target: number;
  createdAt: string;
  updatedAt: string;
  responseCount?: number;
  demo: boolean;
  archivedAt?: string | null;
  deletedAt?: string | null;
  lastOpenedAt?: string;
}
export interface Submission {
  id: string;
  surveyId: string;
  submittedAt: string;
  answers: Record<string, Answer>;
  questionSnapshot: Question[];
  revision: number;
  surveyor?: import('./surveyor-types').SurveyorAttribution;
}
export type TemplateCategory = 'form' | 'presentation' | 'survey';
export interface SavedTemplate {
  slidePreset?: {
    theme: import('./presentation-model').PresentationTheme;
    slides: import('./presentation-model').Slide[];
  };
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  kind: Survey['kind'];
  questions: Question[];
  widgets: Widget[];
  settings: { description: string; institution: string; target: number };
  createdAt: string | null;
  archivedAt: string | null;
  builtIn: boolean;
}
export interface AuditEntry {
  id: string;
  submissionId: string;
  questionId: string;
  before: Answer | null;
  after: Answer;
  at: string;
  actor: string;
}
export interface Distribution {
  name: string;
  count: number;
  score?: number;
}
export interface Indicator {
  id: string;
  label: string;
  average: number;
  answered: number;
  missing: number;
  distribution: Distribution[];
}
export interface SurveyStats {
  total: number;
  indicators: Indicator[];
  ikm: number | null;
  grade: string;
  category: string;
  completion: number;
}
export interface SurveyInsights {
  stats: SurveyStats;
  questions: Record<string, { answered: number; distribution: Distribution[]; samples: string[] }>;
}
export interface ResponsePage {
  rows: Submission[];
  total: number;
  filtered: number;
  page: number;
  pageSize: number;
  audit: AuditEntry[];
}
