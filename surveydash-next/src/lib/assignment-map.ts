import { provinces, isProvinceId } from './provinces';
import type { ManagedSurveyorAssignment, ProvinceTarget } from './surveyor-types';

/** Live pages supply response-time province snapshots; the fallback supports legacy callers. */
export function assignmentMap(
  assignments: (Pick<ManagedSurveyorAssignment, 'provinceId' | 'username' | 'active'> & {
    responseCount?: number;
  })[],
  targets: ProvinceTarget[] = [],
  unattributedResponses = 0,
  provinceResponses?: { provinceId: string | null; count: number }[],
) {
  const rows = provinces.map((province) => {
    const tasks = assignments.filter((assignment) => assignment.provinceId === province.id);
    const configured = targets.filter((entry) => entry.provinceId === province.id);
    return {
      ...province,
      tasks: tasks.length,
      people: new Set(tasks.map((task) => task.username)).size,
      active: tasks.filter((task) => task.active).length,
      activePeople: new Set(tasks.filter((task) => task.active).map((task) => task.username)).size,
      respondents: provinceResponses
        ? provinceResponses
            .filter((entry) => entry.provinceId === province.id)
            .reduce((sum, entry) => sum + entry.count, 0)
        : tasks.reduce((sum, task) => sum + (task.responseCount ?? 0), 0),
      target: configured.length ? configured.reduce((sum, entry) => sum + entry.target, 0) : null,
    };
  });
  const unmapped = assignments.filter((task) => !task.provinceId || !isProvinceId(task.provinceId)).length;
  const respondents = provinceResponses
    ? provinceResponses.reduce((sum, entry) => sum + entry.count, 0)
    : assignments.reduce((sum, task) => sum + (task.responseCount ?? 0), unattributedResponses);
  return {
    rows,
    unmapped,
    total: assignments.length,
    covered: rows.filter((row) => row.tasks > 0).length,
    people: new Set(assignments.filter((task) => task.active).map((task) => task.username)).size,
    respondents,
    unmappedRespondents: respondents - rows.reduce((sum, row) => sum + row.respondents, 0),
    target: targets.length ? targets.reduce((sum, row) => sum + row.target, 0) : null,
  };
}

export type ProvinceMapRow = ReturnType<typeof assignmentMap>['rows'][number];
export function provinceMapLabel(row: ProvinceMapRow) {
  const target = row.target === null ? 'target belum diatur' : `target ${row.target.toLocaleString('id-ID')}`;
  return `${row.name}: ${row.respondents.toLocaleString('id-ID')} responden, ${row.activePeople} surveyor aktif, ${target}`;
}

/** Tooltip positioning stays inside the map frame, including narrow mobile frames. */
export function mapTooltipPosition(
  x: number,
  y: number,
  frame: { width: number; height: number },
  tooltip: { width: number; height: number },
) {
  const left = x + tooltip.width + 20 > frame.width ? x - tooltip.width - 14 : x + 14;
  const top = y + tooltip.height + 20 > frame.height ? y - tooltip.height - 14 : y + 14;
  return {
    x: Math.max(8, Math.min(left, frame.width - tooltip.width - 8)),
    y: Math.max(8, Math.min(top, frame.height - tooltip.height - 8)),
  };
}
