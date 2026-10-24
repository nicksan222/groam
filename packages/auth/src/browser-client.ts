import { env } from '@groam/env/auth-client';
import { createGroamBrowserAuthClient } from './browser-client-factory';

export const browserAuthClient = createGroamBrowserAuthClient(env.convexSiteUrl);
