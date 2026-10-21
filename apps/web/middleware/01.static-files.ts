import { defineMiddleware } from 'void';

/**
 * Paths with a file extension are static files. Serve them before page routing, so the
 * not-found page (`pages/[...path].tsx`) never answers for `/favicon.ico` or a missing `/x.js`.
 */
export default defineMiddleware(async (c, next) => {
  const fileName = new URL(c.req.url).pathname.split('/').at(-1) ?? '';
  if (!fileName.includes('.')) return next();
  // Void binds the Worker's static files as ASSETS; its generated types are not part of CI.
  return (c.env.ASSETS as Fetcher).fetch(c.req.raw);
});
