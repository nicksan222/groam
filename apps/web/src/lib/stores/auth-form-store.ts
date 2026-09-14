import { create } from 'zustand';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type AuthFlow = 'signIn' | 'signUp';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type AuthFormStore = {
  email: string;
  error: string | null;
  flow: AuthFlow;
  isPending: boolean;
  name: string;
  password: string;
  patch: (update: Partial<Omit<AuthFormStore, 'patch' | 'reset' | 'switchFlow'>>) => void;
  reset: () => void;
  switchFlow: () => void;
};

const initialAuthForm = {
  email: '',
  error: null,
  flow: 'signIn' as AuthFlow,
  isPending: false,
  name: '',
  password: ''
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
      password: ''
    });
  }
}));
