import { createContext, useContext } from 'react';
import type { PlanKind } from '@/types/trip-planner';

const PlanKindContext = createContext<PlanKind>('activity');

/** Lets every piece of a plan card take its hue from the card it sits in. */
export const PlanKindProvider = PlanKindContext.Provider;

export function usePlanKind(): PlanKind {
  return useContext(PlanKindContext);
}
