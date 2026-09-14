import { useState } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import {
  ALL_ACTIVITY_TYPES,
  ALL_ACTIVITY_USERS,
  type TripActivityFilters
} from '@/features/trips/hooks/trip-activity-history-filter';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type TripActivityFilterStore = {
  activityType: TripActivityFilters['activityType'];
  clearFilters: () => void;
  query: string;
  setActivityType: (activityType: TripActivityFilters['activityType']) => void;
  setQuery: (query: string) => void;
  setUserId: (userId: string) => void;
  userId: string;
};

function createTripActivityFilterStore() {
  return createStore<TripActivityFilterStore>()((set) => ({
    activityType: ALL_ACTIVITY_TYPES,
    clearFilters: () => set({ activityType: ALL_ACTIVITY_TYPES, userId: ALL_ACTIVITY_USERS }),
    query: '',
    setActivityType: (activityType) => set({ activityType }),
    setQuery: (query) => set({ query }),
    setUserId: (userId) => set({ userId }),
    userId: ALL_ACTIVITY_USERS
  }));
}

export function useTripActivityFilterState() {
  const [store] = useState(createTripActivityFilterStore);
  return useStore(store);
}
