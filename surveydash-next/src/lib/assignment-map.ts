import { provinces, isProvinceId } from './provinces';
import type { ManagedSurveyorAssignment } from './surveyor-types';

/** Aggregate assignments, not inferred respondent or device locations. */
export function assignmentMap(
  assignments: Pick<ManagedSurveyorAssignment, 'provinceId' | 'username' | 'active'>[],
) {
  const rows = provinces.map((province) => {
    const tasks = assignments.filter((assignment) => assignment.provinceId === province.id);
    return {
      ...province,
      tasks: tasks.length,
      people: new Set(tasks.map((task) => task.username)).size,
      active: tasks.filter((task) => task.active).length,
    };
  });
  const unmapped = assignments.filter((task) => !task.provinceId || !isProvinceId(task.provinceId)).length;
  return { rows, unmapped, total: assignments.length, covered: rows.filter((row) => row.tasks > 0).length };
}
