import { createAuthClient } from 'better-auth/client';
import { createGroamAuthPlugins } from './client-plugins';

export function createGroamBrowserAuthClient(baseURL: string) {
  return createAuthClient({ baseURL, plugins: [...createGroamAuthPlugins()] });
}
