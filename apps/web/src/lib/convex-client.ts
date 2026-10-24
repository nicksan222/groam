import { env } from '@groam/env/web-client';
import { ConvexReactClient } from 'convex/react';

let client: ConvexReactClient | undefined;

/** The browser's one Convex client; Void layouts render on every navigation and must share it. */
export function browserConvexClient(): ConvexReactClient {
  client ??= new ConvexReactClient(env.convexUrl, { expectAuth: true });
  return client;
}
