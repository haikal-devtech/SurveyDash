import { provinces, isProvinceId } from './provinces';
import type { RegisteredSurveyor } from './admin-surveyors';
export function surveyorDirectoryMap(surveyors: RegisteredSurveyor[]) {
  return {
    rows: provinces.map((province) => ({
      ...province,
      people: surveyors.filter((person) => person.provinceId === province.id).length,
    })),
    total: surveyors.length,
    unmapped: surveyors.filter((person) => !person.provinceId || !isProvinceId(person.provinceId)).length,
  };
}
