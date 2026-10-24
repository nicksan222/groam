import { BedDouble, MapPin, Route } from '@groam/icons';
import { testIds } from '@/lib/test-ids';
import type { IssueFlagTarget } from '@/types/issues';

const icons = {
  activity: MapPin,
  activity_transfer: Route,
  boundary_transfer: Route,
  destination: MapPin,
  destination_transfer: Route,
  stay: BedDouble
} as const;

/** "About <item>" as a quiet chip with the item's icon: what the question is attached to. */
export function FlagTargetChip({ target }: { target: IssueFlagTarget }) {
  const Icon = icons[target.subject.type];
  return (
    <p
      className="inline-flex max-w-full items-center gap-2 self-start rounded-md bg-muted/60 px-3 py-1 text-xs text-muted-foreground"
      data-testid={testIds.createIssueAbout}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">
        About <span className="font-medium text-foreground">{target.label}</span>
      </span>
    </p>
  );
}
