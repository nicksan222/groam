import { GroamAuthProvider } from '@groam/auth/provider';
import { UiThemeProvider } from '@groam/ui/components/theme-provider';
import type { ConvexReactClient } from 'convex/react';
import { StrictMode } from 'react';
import App from './app.tsx';

/** The whole app as users get it; journeys mount the same tree. */
export function AppRoot({ client }: { client: ConvexReactClient }) {
  return (
    <StrictMode>
      <UiThemeProvider>
        <GroamAuthProvider client={client}>
          <App />
        </GroamAuthProvider>
      </UiThemeProvider>
    </StrictMode>
  );
}
