import Shell from '@groam/ui/components/shell/client';
import type { ReactNode } from 'react';

/**
 * A trip section's body. The page header above names the section; this adds a quiet row for the
 * section's count and its create actions, then the content.
 */
export function TripSectionPanel({
  badge,
  children,
  dataSection,
  fill = false,
  stretch = false,
  testId,
  title,
  trailing
}: {
  badge?: string;
  children: ReactNode;
  /** Written to `data-section`, so a journey can tell which section's panel is on screen. */
  dataSection?: string;
  /** Takes the page's whole height, for a body that scrolls inside itself. */
  fill?: boolean;
  /** Grows to the page body's height so a footer can rest at the bottom of a short list. */
  stretch?: boolean;
  testId?: string;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <Shell.Stack
      aria-label={title}
      as="section"
      className={fill || stretch ? 'flex min-h-0 flex-1 flex-col' : undefined}
      data-section={dataSection}
      data-testid={testId}
      stack="page"
    >
      {badge || trailing ? (
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{badge}</p>
          {trailing}
        </div>
      ) : null}
      {children}
    </Shell.Stack>
  );
}
