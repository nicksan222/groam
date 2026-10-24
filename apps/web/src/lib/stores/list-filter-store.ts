import { useState } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type ListFilterStore<TStatus extends string> = {
  clearStatusFilter: () => void;
  query: string;
  setQuery: (query: string) => void;
  setStatusFilter: (status: TStatus) => void;
  statusFilter: TStatus;
};

function createListFilterStore<TStatus extends string>(
  defaultStatus: TStatus,
  initialStatus: TStatus
) {
  return createStore<ListFilterStore<TStatus>>()((set) => ({
    clearStatusFilter: () => set({ statusFilter: defaultStatus }),
    query: '',
    setQuery: (query) => set({ query }),
    setStatusFilter: (statusFilter) => set({ statusFilter }),
    statusFilter: initialStatus
  }));
}

/** `initialStatus` starts the filter somewhere other than its default (for example, from a link). */
export function useListFilterState<TStatus extends string>(
  defaultStatus: TStatus,
  initialStatus: TStatus = defaultStatus
) {
  const [store] = useState(() => createListFilterStore(defaultStatus, initialStatus));
  return useStore(store);
}
