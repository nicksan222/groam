import { env } from '@groam/env/auth-client';
import { createGroamAuthClient } from './client-factory';

export const authClient = createGroamAuthClient(env.convexSiteUrl);

export type AuthClient = typeof authClient;
