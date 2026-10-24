import type { authClient } from '@groam/auth/client';
import { create } from 'zustand';
import type {
  ActiveOrganization,
  Session
} from '@/features/workspace/workspace-shell/workspace-state';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type SettingsPatch<T> = Partial<T> & { patch?: never; reset?: never };

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type ProfileSettingsStore = {
  error: string | null;
  image: string;
  isPending: boolean;
  message: string | null;
  name: string;
  username: string;
  patch: (update: SettingsPatch<ProfileSettingsStore>) => void;
  resetFromUser: (user: Session['user']) => void;
};

export const useProfileSettingsStore = create<ProfileSettingsStore>((set) => ({
  error: null,
  image: '',
  isPending: false,
  message: null,
  name: '',
  username: '',
  patch: (update) => set((state) => ({ ...state, ...update })),
  resetFromUser: (user) =>
    set((state) => {
      const next = {
        error: null,
        image: user.image ?? '',
        isPending: false,
        message: null,
        name: user.name,
        username: user.username ?? ''
      };
      if (
        state.error === next.error &&
        state.image === next.image &&
        state.isPending === next.isPending &&
        state.message === next.message &&
        state.name === next.name &&
        state.username === next.username
      ) {
        return state;
      }
      return next;
    })
}));

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type OrganizationSettingsStore = {
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

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type PasswordSettingsStore = {
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

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type AccountSession = NonNullable<
  Awaited<ReturnType<typeof authClient.listSessions>>['data']
>[number];

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type SessionSettingsStore = {
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
