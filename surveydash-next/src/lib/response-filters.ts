export type ResponseFilters = { province: string; surveyor: string; after: string; before: string };
export const emptyResponseFilters: ResponseFilters = { province: '', surveyor: '', after: '', before: '' };
export function responseFilterParams(filters: ResponseFilters) {
  return {
    ...(filters.province ? { province: filters.province } : {}),
    ...(filters.surveyor.trim() ? { surveyor: filters.surveyor.trim() } : {}),
    ...(filters.after ? { after: filters.after + 'T00:00:00+07:00' } : {}),
    ...(filters.before ? { before: filters.before + 'T23:59:59.999+07:00' } : {}),
  };
}
