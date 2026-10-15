import { authClient } from '@groam/auth/client';
import { createContext } from 'react';

/** Ends the session; the app shell provides one that leaves the workspace first. */
export const SignOutContext = createContext(async (): Promise<void> => {
  await authClient.signOut();
});
