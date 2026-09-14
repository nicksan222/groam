import { useState } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type ListFilterStore<TStatus extends string> = {
  clearStatusFilter: () => void;
  query: string;
  setQuery: (query: string) => void;
  setStatusFilter: (status: TStatus) => void;
  statusFilter: TStatus;
};

function createListFilterStore<TStatus extends string>(defaultStatus: TStatus) {
  return createStore<ListFilterStore<TStatus>>()((set) => ({
    clearStatusFilter: () => set({ statusFilter: defaultStatus }),
    query: '',
    setQuery: (query) => set({ query }),
    setStatusFilter: (statusFilter) => set({ statusFilter }),
    statusFilter: defaultStatus
  }));
}

export function useListFilterState<TStatus extends string>(defaultStatus: TStatus) {
  const [store] = useState(() => createListFilterStore(defaultStatus));
  return useStore(store);
}
