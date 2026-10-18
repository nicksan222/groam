import { httpRouter } from 'convex/server';
import { components } from './_generated/api';
import { registerLandingStaticRoutes, registerSpaStaticRoutes } from './hosting';
import { chatGptCallback } from './modules/ai/chatgpt/callback';
import { authComponent, authTrustedOrigins, createAuth } from './modules/auth/auth';

const http = httpRouter();

// Exact Better Auth routes take priority over the static catch-all.
authComponent.registerRoutesLazy(http, createAuth, {
  cors: true,
  trustedOrigins: authTrustedOrigins
});
http.route({ path: '/auth/chatgpt/callback', method: 'GET', handler: chatGptCallback });

registerSpaStaticRoutes(http, components.web, '/app/');
registerLandingStaticRoutes(http, components.landing);

export default http;
