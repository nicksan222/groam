import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import type { ReactNode } from 'react';
import { TripFloatingNotices } from './trip-floating-notices';

export function TripPageShell({
  banner,
  body,
  children,
  clearNav = false,
  fullBleed = false,
  header,
  isLoading = false,
  notice
}: {
  banner?: ReactNode;
  body: ReactNode;
  children?: ReactNode;
  /** Leaves room under the page for the phone bottom nav (a long conversation). */
  clearNav?: boolean;
  /** A filled page (Calendar) scrolls inside itself, so its body takes the full width and height. */
  fullBleed?: boolean;
  header: ReactNode;
  isLoading?: boolean;
  notice?: ReactNode;
}) {
  if (isLoading) return <PageLoading label="Loading trip…" />;

  return (
    <Shell className="trip-page-shell">
      <Shell.BannerLayout className="trip-page-ready">
        {header}
        <Shell.PageBody
          clearNav={clearNav}
          data-slot="trip-page-body"
          layout={fullBleed ? 'bleed' : 'padded'}
        >
          {body}
        </Shell.PageBody>
        <TripFloatingNotices>
          {banner}
          {notice}
        </TripFloatingNotices>
      </Shell.BannerLayout>
      {children}
    </Shell>
  );
}
