import { env } from '@groam/env/web-client';
import { ConvexReactClient } from 'convex/react';

let client: ConvexReactClient | undefined;

/** The browser's one Convex client; layouts render on every navigation and must share it. */
export function browserConvexClient(): ConvexReactClient {
  // The sign-in screen reads public email availability before an auth token exists.
  client ??= new ConvexReactClient(env.convexUrl);
  return client;
}
