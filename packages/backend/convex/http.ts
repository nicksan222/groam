import { httpRouter } from 'convex/server';
import { chatGptCallback } from './modules/ai/chatgpt/callback';
import { authComponent, authTrustedOrigins, createAuth } from './modules/auth/auth';
import { registerSiteRoutes } from './modules/hosting/site';
import { registerPaymentWebhook } from './modules/payments/webhook';

const http = httpRouter();
registerPaymentWebhook(http);

authComponent.registerRoutesLazy(http, createAuth, {
  cors: true,
  trustedOrigins: authTrustedOrigins
});
http.route({ path: '/auth/chatgpt/callback', method: 'GET', handler: chatGptCallback });

// After every app route: exact paths and longer prefixes win over these frontend catch-alls.
registerSiteRoutes(http);

export default http;
