/** The page's workspace is a concurrency precondition, never an authorization grant. */
export const WORKSPACE_HEADER = 'x-studio-workspace';
export function workspaceRequestHeaders(ownerId: string, init?: HeadersInit) {
  const headers = new Headers(init);
  headers.set(WORKSPACE_HEADER, ownerId);
  return headers;
}
export function workspaceFetch(input: string, init?: RequestInit) {
  const scoped =
    /^\/api\/(surveys(?:\/|$)|templates(?:\/|$)|presentations(?:\/|$)|assets(?:\/|$)|import\/|workspace(?:\?|$|\/(?:team|invitation$|surveyors|blocks|activity|fieldwork|retention)))/.test(
      input,
    );
  const ownerId =
    typeof document === 'undefined'
      ? undefined
      : document.querySelector<HTMLElement>('[data-workspace-owner]')?.dataset.workspaceOwner;
  return fetch(
    input,
    scoped && ownerId ? { ...init, headers: workspaceRequestHeaders(ownerId, init?.headers) } : init,
  );
}
