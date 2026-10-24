import { createAuthClient } from 'better-auth/react';
import { createGroamAuthPlugins } from './client-plugins';

export function createGroamAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    // The SPA reacts to the session signal; callbackURL is also used in verification mail.
    // Better Auth's default redirect plugin would reload the document after password sign-in.
    disableDefaultFetchPlugins: true,
    plugins: [...createGroamAuthPlugins()]
  });
}
