'use client';

import { createContext, useContext, type ReactNode } from 'react';

const DashboardMotionContext = createContext(false);

export function DashboardMotionProvider({ children }: { children: ReactNode }) {
  return <DashboardMotionContext.Provider value={true}>{children}</DashboardMotionContext.Provider>;
}

export function useDashboardMotion() {
  return useContext(DashboardMotionContext);
}
