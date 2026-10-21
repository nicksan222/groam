import '@/index.css';
import { AppRoot } from '@/app-root';
import { browserConvexClient } from '@/lib/convex-client';
import type { LayoutProps } from '@/lib/navigation/router';

/** The root layout of every workspace page, with the browser's Convex client. */
export function AppLayout({ children }: LayoutProps) {
  return <AppRoot client={browserConvexClient()}>{children}</AppRoot>;
}
