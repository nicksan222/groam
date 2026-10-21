import { httpRouter } from 'convex/server';
import { chatGptCallback } from './modules/ai/chatgpt/callback';
import { authComponent, authTrustedOrigins, createAuth } from './modules/auth/auth';

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
  cors: true,
  trustedOrigins: authTrustedOrigins
});
http.route({ path: '/auth/chatgpt/callback', method: 'GET', handler: chatGptCallback });

export default http;
