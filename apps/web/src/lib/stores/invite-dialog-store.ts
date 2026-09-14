import { create } from 'zustand';
import type { RequestState } from '@/lib/stores/async-request-store';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type InviteDialogStore = {
  copied: boolean;
  email: string;
  inviteLink: string | null;
  request: RequestState;
  role: 'admin' | 'member';
  patchRequest: (update: Partial<RequestState>) => void;
  reset: () => void;
  setCopied: (copied: boolean) => void;
  setEmail: (email: string) => void;
  setInviteLink: (inviteLink: string | null) => void;
  setRole: (role: 'admin' | 'member') => void;
};

const emptyRequest: RequestState = { error: null, isPending: false };

/** Invite dialog draft state — submit logic stays in the hook. */
export const useInviteDialogStore = create<InviteDialogStore>((set) => ({
  copied: false,
  email: '',
  inviteLink: null,
  request: emptyRequest,
  role: 'member',
  patchRequest: (update) =>
    set((state) => ({
      request: { ...state.request, ...update }
    })),
  reset: () =>
    set({
      copied: false,
      email: '',
      inviteLink: null,
      request: emptyRequest,
      role: 'member'
    }),
  setCopied: (copied) => set({ copied }),
  setEmail: (email) => set({ email }),
  setInviteLink: (inviteLink) => set({ inviteLink }),
  setRole: (role) => set({ role })
}));
