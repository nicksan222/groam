import type { Id } from '@groam/backend/data-model';
import Shell from '@groam/ui/components/shell/client';
import { Eye, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import { IdeaStatusBadge } from '@/features/ideas/idea-status-badge';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import type { IdeaStatus } from '@/types/ideas';

export function IdeaWorkspaceHeading({
  actions,
  sourceTripName,
  status,
  trip,
  tripId,
  reviewing
}: {
  actions: ReactNode;
  sourceTripName?: string;
  status: IdeaStatus;
  trip: TripDetail;
  tripId: Id<'trips'>;
  reviewing: boolean;
}) {
  const idea = useOptionalIdeaContext();
  const canEdit = trip.permissions.canEdit;
  const Icon = canEdit && !reviewing ? Pencil : Eye;
  const title = idea?.proposal?.title ?? trip.name;
  return (
    <div className="border-y border-primary/20 bg-primary/5 px-4 py-3 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Icon className="size-4" />
            {reviewing
              ? 'Reviewing changes'
              : canEdit
                ? 'Editing idea'
                : 'Viewing idea · Read-only'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Shell.Title
              className="break-words"
              data-testid={testIds.tripHeading}
              data-trip-id={tripId}
              data-trip-name={trip.name}
            >
              {title}
            </Shell.Title>
            <span data-testid={testIds.ideaStatusBadge}>
              <IdeaStatusBadge
                conflictCount={idea?.proposal?.conflicts.length ?? 0}
                status={status}
              />
            </span>
          </div>
          <p className="mt-2 hidden text-sm text-muted-foreground sm:block">
            An idea for {sourceTripName ?? idea?.sharedTrip?.name ?? trip.name}
          </p>
        </div>
        {actions}
      </div>
      <p className="mt-4 border-t border-primary/15 pt-3 text-sm text-muted-foreground">
        {reviewing
          ? 'Compare this idea with the shared trip before deciding what to apply.'
          : canEdit
            ? 'Changes stay in this idea until approved and applied.'
            : 'You can explore this plan, but you cannot edit it in its current state.'}
      </p>
    </div>
  );
}
