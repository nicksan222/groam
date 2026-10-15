'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

/** Theme provider with the system color scheme as the default. */
export function UiThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableColorScheme
      enableSystem
      // Client-rendered apps never run this anti-flash script; as a data block React stops warning.
      scriptProps={{ type: 'application/json' }}
      storageKey="groam-theme"
    >
      {children}
    </ThemeProvider>
  );
}
