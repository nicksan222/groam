import { registerStaticRoutes } from '@convex-dev/static-hosting';
import { httpRouter } from 'convex/server';
import { components } from './_generated/api';
import { chatGptCallback } from './modules/ai/chatgpt/callback';
import { authComponent, authTrustedOrigins, createAuth } from './modules/auth/auth';

const http = httpRouter();

// Exact Better Auth routes take priority over the static catch-all.
authComponent.registerRoutesLazy(http, createAuth, {
  cors: true,
  trustedOrigins: authTrustedOrigins
});
http.route({ path: '/auth/chatgpt/callback', method: 'GET', handler: chatGptCallback });
registerStaticRoutes(http, components.web);

export default http;
