import { GroamAuthProvider } from '@groam/auth/provider';
import { UiThemeProvider } from '@groam/ui/components/theme-provider';
import type { ConvexReactClient } from 'convex/react';
import { type PropsWithChildren, StrictMode } from 'react';
import App from './app.tsx';

/** The providers around every page as users get them; journeys mount the same tree. */
export function AppRoot({ children, client }: PropsWithChildren<{ client: ConvexReactClient }>) {
  return (
    <StrictMode>
      <UiThemeProvider>
        <GroamAuthProvider client={client}>
          <App>{children}</App>
        </GroamAuthProvider>
      </UiThemeProvider>
    </StrictMode>
  );
}
