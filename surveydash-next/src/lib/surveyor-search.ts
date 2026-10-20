import type { ManagedSurveyorAssignment } from './surveyor-types';
export type SurveyorStatusFilter = 'all' | 'active' | 'inactive';
export function matchesSurveyor(
  assignment: Pick<ManagedSurveyorAssignment, 'username' | 'fullName' | 'active'>,
  query: string,
  status: SurveyorStatusFilter = 'all',
  surveyTitle = '',
) {
  if ((status === 'active' && !assignment.active) || (status === 'inactive' && assignment.active))
    return false;
  const words = query
    .trim()
    .toLocaleLowerCase('id-ID')
    .split(/\s+/)
    .map((word) => word.replace(/^@/, ''))
    .filter(Boolean);
  const text = [assignment.username, assignment.fullName, surveyTitle].join(' ').toLocaleLowerCase('id-ID');
  return words.every((word) => text.includes(word));
}
