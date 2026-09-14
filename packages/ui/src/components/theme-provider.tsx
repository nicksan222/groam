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
      storageKey="groam-theme"
    >
      {children}
    </ThemeProvider>
  );
}
