import { useState } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createStore } from 'zustand/vanilla';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type AsyncPendingStore = {
  isPending: boolean;
  run: <T>(action: () => Promise<T>) => Promise<T | undefined>;
  setPending: (isPending: boolean) => void;
};

function createAsyncPendingStore() {
  return createStore<AsyncPendingStore>()((set) => ({
    isPending: false,
    run: async (action) => {
      set({ isPending: true });
      try {
        return await action();
      } finally {
        set({ isPending: false });
      }
    },
    setPending: (isPending) => set({ isPending })
  }));
}

/** Tracks a single in-flight async action. */
export function useAsyncPendingState() {
  const [store] = useState(createAsyncPendingStore);
  return useStore(store);
}

import type { RequestState } from '@/types/workspace';

export type { RequestState };

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type RequestStore = RequestState & {
  patch: (update: Partial<RequestState>) => void;
  reset: () => void;
};

const emptyRequest: RequestState = { error: null, isPending: false };

function createRequestStore(initial: RequestState = emptyRequest) {
  return createStore<RequestStore>()((set) => ({
    ...initial,
    patch: (update) => set((state) => ({ ...state, ...update })),
    reset: () => set(emptyRequest)
  }));
}

/** Tracks pending + error for a single form submission. */
export function useRequestState() {
  const [store] = useState(createRequestStore);
  const request = useStore(
    store,
    useShallow((state) => ({
      error: state.error,
      isPending: state.isPending
    }))
  );
  const setRequest = useStore(store, (state) => state.patch);
  return [request, setRequest] as const;
}
