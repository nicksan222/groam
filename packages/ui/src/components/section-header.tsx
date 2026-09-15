import type { ReactNode } from 'react';
import type { SectionHeaderProps as ShellSectionHeaderProps } from '#src/components/shell/types/banner';
import ShellSectionHeader from '#tsx/components/shell/components/section-header';

/** Title block for settings and other non-trip pages; optional `action` renders top-right. */
export type SectionHeaderProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

/** Generic page section header with title, description, and optional action slot. */
function SectionHeader({ action, description, title }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export type TripSectionHeaderProps = ShellSectionHeaderProps;

/** Branded section header for trip detail and itinerary views. */
function TripSectionHeader(props: TripSectionHeaderProps) {
  return <ShellSectionHeader {...props} />;
}

export { SectionHeader, TripSectionHeader };
