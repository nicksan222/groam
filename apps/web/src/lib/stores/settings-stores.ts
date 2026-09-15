import { type AiKeyProviderId, isAiKeyProviderId } from '@groam/ai-contracts/providers/keys';
import type { authClient } from '@groam/auth/client';
import { create } from 'zustand';
import type {
  ActiveOrganization,
  Session
} from '@/features/workspace/workspace-shell/workspace-state';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type SettingsPatch<T> = Partial<T> & { patch?: never; reset?: never };

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type ProfileSettingsStore = {
  error: string | null;
  image: string;
  isPending: boolean;
  message: string | null;
  name: string;
  patch: (update: SettingsPatch<ProfileSettingsStore>) => void;
  resetFromUser: (user: Session['user']) => void;
};

export const useProfileSettingsStore = create<ProfileSettingsStore>((set) => ({
  error: null,
  image: '',
  isPending: false,
  message: null,
  name: '',
  patch: (update) => set((state) => ({ ...state, ...update })),
  resetFromUser: (user) =>
    set((state) => {
      const next = {
        error: null,
        image: user.image ?? '',
        isPending: false,
        message: null,
        name: user.name
      };
      if (
        state.error === next.error &&
        state.image === next.image &&
        state.isPending === next.isPending &&
        state.message === next.message &&
        state.name === next.name
      ) {
        return state;
      }
      return next;
    })
}));

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type OrganizationSettingsStore = {
  error: string | null;
  isPending: boolean;
  logo: string;
  message: string | null;
  name: string;
  slug: string;
  patch: (update: SettingsPatch<OrganizationSettingsStore>) => void;
  resetFromOrganization: (organization: ActiveOrganization) => void;
};

export const useOrganizationSettingsStore = create<OrganizationSettingsStore>((set) => ({
  error: null,
  isPending: false,
  logo: '',
  message: null,
  name: '',
  slug: '',
  patch: (update) => set((state) => ({ ...state, ...update })),
  resetFromOrganization: (organization) =>
    set((state) => {
      const next = {
        error: null,
        isPending: false,
        logo: organization.logo ?? '',
        message: null,
        name: organization.name,
        slug: organization.slug
      };
      if (
        state.error === next.error &&
        state.isPending === next.isPending &&
        state.logo === next.logo &&
        state.message === next.message &&
        state.name === next.name &&
        state.slug === next.slug
      ) {
        return state;
      }
      return next;
    })
}));

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type PasswordSettingsStore = {
  confirmPassword: string;
  currentPassword: string;
  error: string | null;
  isPending: boolean;
  message: string | null;
  newPassword: string;
  patch: (update: SettingsPatch<PasswordSettingsStore>) => void;
  reset: () => void;
};

const emptyPasswordSettings = {
  confirmPassword: '',
  currentPassword: '',
  error: null,
  isPending: false,
  message: null,
  newPassword: ''
};

export const usePasswordSettingsStore = create<PasswordSettingsStore>((set) => ({
  ...emptyPasswordSettings,
  patch: (update) => set((state) => ({ ...state, ...update })),
  reset: () => set(emptyPasswordSettings)
}));

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type AccountSession = NonNullable<
  Awaited<ReturnType<typeof authClient.listSessions>>['data']
>[number];

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type SessionSettingsStore = {
  error: string | null;
  isLoading: boolean;
  pendingAction: 'others' | string | null;
  sessions: AccountSession[];
  patch: (update: SettingsPatch<SessionSettingsStore>) => void;
  reset: () => void;
};

const emptySessionSettings = {
  error: null,
  isLoading: true,
  pendingAction: null,
  sessions: [] as AccountSession[]
};

export const useSessionSettingsStore = create<SessionSettingsStore>((set) => ({
  ...emptySessionSettings,
  patch: (update) => set((state) => ({ ...state, ...update })),
  reset: () => set(emptySessionSettings)
}));

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type AiSettingsDraft = {
  apiKey: string;
  baseUrl: string | null;
  error: string | null;
  isPending: boolean;
  message: string | null;
  model: string | null;
  provider: AiKeyProviderId | null;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type AiSettingsDraftStore = AiSettingsDraft & {
  patch: (update: Partial<AiSettingsDraft>) => void;
  resetDraft: () => void;
  selectProvider: (value: string) => void;
};

const emptyAiDraft: AiSettingsDraft = {
  apiKey: '',
  baseUrl: null,
  error: null,
  isPending: false,
  message: null,
  model: null,
  provider: null
};

export const useAiSettingsDraftStore = create<AiSettingsDraftStore>((set, get) => ({
  ...emptyAiDraft,
  patch: (update) => set((state) => ({ ...state, ...update })),
  resetDraft: () => set(emptyAiDraft),
  selectProvider: (value) => {
    if (!isAiKeyProviderId(value) || value === get().provider) return;
    set({ baseUrl: null, model: null, provider: value });
  }
}));
