'use client';
import { useId, useSyncExternalStore, type ReactNode } from 'react';
type Entry = { content: ReactNode; listeners: Set<() => void> };
// Written only by the client walkthrough's layout effect. SSR always sees an empty host.
const entries = new Map<string, Entry>();
function entry(id: string) {
  let state = entries.get(id);
  if (!state) {
    state = { content: null, listeners: new Set() };
    entries.set(id, state);
  }
  return state;
}
export function publishTourCoach(id: string, content: ReactNode) {
  const state = entry(id);
  if (state.content === content) return;
  state.content = content;
  for (const listener of state.listeners) listener();
  if (content === null && !state.listeners.size) entries.delete(id);
}
export function TourHost() {
  const id = useId();
  const content = useSyncExternalStore(
    (listener) => {
      const state = entry(id);
      state.listeners.add(listener);
      return () => {
        state.listeners.delete(listener);
        if (state.content === null && !state.listeners.size) entries.delete(id);
      };
    },
    () => entries.get(id)?.content ?? null,
    () => null,
  );
  return <div data-tour-host={id}>{content}</div>;
}
