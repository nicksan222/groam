import { create } from 'zustand';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type AuthFlow = 'recover' | 'signIn' | 'signUp';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type AuthFormStore = {
  error: string | null;
  flow: AuthFlow;
  identifier: string;
  isPending: boolean;
  name: string;
  newPassword: string;
  needsTwoFactor: boolean;
  password: string;
  recoveryCode: string;
  twoFactorCode: string;
  patch: (
    update: Partial<Omit<AuthFormStore, 'patch' | 'reset' | 'switchFlow' | 'switchToRecovery'>>
  ) => void;
  reset: () => void;
  switchFlow: () => void;
  switchToRecovery: () => void;
};

const initialAuthForm = {
  error: null,
  flow: 'signIn' as AuthFlow,
  identifier: '',
  isPending: false,
  name: '',
  newPassword: '',
  needsTwoFactor: false,
  password: '',
  recoveryCode: '',
  twoFactorCode: ''
};

/** Auth screen draft state — submit logic stays in the hook. */
export const useAuthFormStore = create<AuthFormStore>((set, get) => ({
  ...initialAuthForm,
  patch: (update) => set((state) => ({ ...state, ...update })),
  reset: () => set(initialAuthForm),
  switchFlow: () => {
    const isSignIn = get().flow === 'signIn';
    set({
      error: null,
      flow: isSignIn ? 'signUp' : 'signIn',
      needsTwoFactor: false,
      password: '',
      twoFactorCode: ''
    });
  },
  switchToRecovery: () =>
    set({
      error: null,
      flow: 'recover',
      needsTwoFactor: false,
      password: '',
      twoFactorCode: ''
    })
}));
