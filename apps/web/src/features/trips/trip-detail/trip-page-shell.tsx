import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';

export function TripPageShell({
  banner,
  body,
  children,
  crumb,
  hero,
  isLoading = false,
  nav,
  notice
}: {
  banner?: ReactNode;
  body: ReactNode;
  children?: ReactNode;
  crumb: ReactNode;
  hero: ReactNode;
  isLoading?: boolean;
  nav: ReactNode;
  notice?: ReactNode;
}) {
  if (isLoading) return <PageLoading label="Loading trip…" />;

  return (
    <Shell className="trip-page-shell">
      <Shell.BannerLayout className={cn(!isLoading && 'trip-page-ready')}>
        <Shell.Banner className="static shrink-0">
          <Shell.BannerCrumb>{crumb}</Shell.BannerCrumb>
          {hero}
        </Shell.Banner>
        {banner}
        <div className="sticky top-0 z-10 shrink-0 bg-background">{nav}</div>
        {notice}
        <Shell.PageBody>{body}</Shell.PageBody>
      </Shell.BannerLayout>
      {children}
    </Shell>
  );
}
