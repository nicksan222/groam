import { authClient } from '@groam/auth/client';
import { useShallow } from 'zustand/react/shallow';
import { errorMessage } from '@/lib/errors';
import { useAuthFormStore } from '@/lib/stores/auth-form-store';

export function useAuthForm() {
  const state = useAuthFormStore(
    useShallow((store) => ({
      email: store.email,
      error: store.error,
      flow: store.flow,
      isPending: store.isPending,
      name: store.name,
      password: store.password
    }))
  );
  const patch = useAuthFormStore((store) => store.patch);
  const switchFlow = useAuthFormStore((store) => store.switchFlow);
  const isSignIn = state.flow === 'signIn';

  const submit = async () => {
    if (!state.email || !state.password || (!isSignIn && !state.name.trim())) {
      patch({ error: 'Complete every required field to continue.' });
      return;
    }
    if (state.password.length < 8) {
      patch({ error: 'Your password must be at least 8 characters.' });
      return;
    }

    patch({ error: null, isPending: true });
    try {
      const result = isSignIn
        ? await authClient.signIn.email({ email: state.email, password: state.password })
        : await authClient.signUp.email({
            email: state.email,
            name: state.name.trim(),
            password: state.password
          });
      if (result.error) {
        throw new Error(result.error.message ?? 'Authentication failed');
      }
    } catch (error: unknown) {
      patch({ error: errorMessage(error, 'Authentication failed') });
    } finally {
      patch({ isPending: false });
    }
  };

  return { isSignIn, state, submit, switchFlow, updateState: patch };
}
