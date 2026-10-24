import type { api } from '@groam/backend/api';
import type { FunctionReturnType } from 'convex/server';

export type PackingItem = FunctionReturnType<typeof api.routes.trips.packing.list.run>[number];
export type PersonalPackingItem = FunctionReturnType<
  typeof api.routes.trips.packing.personal.list.run
>[number];

/** A traveler an idea's author can assign gear to. */
export type GearTraveler = { name: string; userId: string };

/** How well the group's bringers cover what one gear item needs. */
export type PackingCoverage = {
  /** How many more are needed (`missing`) or how many too many (`over`); 0 when covered. */
  amount: number;
  label: string;
  state: 'covered' | 'missing' | 'over';
};
