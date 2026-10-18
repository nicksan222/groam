import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import { TripFloatingNotices } from './trip-floating-notices';

export function TripPageShell({
  banner,
  body,
  children,
  hero,
  isLoading = false,
  nav,
  notice
}: {
  banner?: ReactNode;
  body: ReactNode;
  children?: ReactNode;
  hero: ReactNode;
  isLoading?: boolean;
  nav: ReactNode;
  notice?: ReactNode;
}) {
  if (isLoading) return <PageLoading label="Loading trip…" />;

  return (
    <Shell className="trip-page-shell">
      <Shell.BannerLayout className={cn(!isLoading && 'trip-page-ready')}>
        {hero}
        <div className="sticky top-0 z-10 shrink-0 bg-background">{nav}</div>
        <div
          className="flex min-w-0 flex-1 shrink-0 flex-col px-6 py-5"
          data-slot="trip-board-area"
        >
          {body}
        </div>
        <TripFloatingNotices>
          {banner}
          {notice}
        </TripFloatingNotices>
      </Shell.BannerLayout>
      {children}
    </Shell>
  );
}
