import {
  ConvexBetterAuthProvider,
  type AuthClient as ConvexProviderAuthClient
} from '@convex-dev/better-auth/react';
import type { ConvexReactClient } from 'convex/react';
import type { PropsWithChildren } from 'react';
import { authClient } from './client';

export function GroamAuthProvider({
  children,
  client
}: PropsWithChildren<{ client: ConvexReactClient }>) {
  return (
    <ConvexBetterAuthProvider
      // The integration's AuthClient union does not preserve third-party plugin inference.
      authClient={authClient as unknown as ConvexProviderAuthClient}
      client={client}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
