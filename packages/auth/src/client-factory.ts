import { createAuthClient } from 'better-auth/react';
import { createGroamAuthPlugins } from './client-plugins';

export function createGroamAuthClient(baseURL: string) {
  return createAuthClient({ baseURL, plugins: [...createGroamAuthPlugins()] });
}
