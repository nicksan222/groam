import { create } from 'zustand';

/** The group being made active; the workspace stays paused until the session reports it. */
export const useGroupActivationStore = create<{ organizationId: string | null }>(() => ({
  organizationId: null
}));
