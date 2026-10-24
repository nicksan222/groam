import type { Id } from '@groam/backend/data-model';
import Shell from '@groam/ui/components/shell/client';
import { SHELL_HEADER_FACT } from '@groam/ui/lib/shell-layout';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { budgetSummary } from '@/features/trips/trip-overview/trip-budget-label';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { IdeaPrimaryAction, IdeaStatus } from '@/types/ideas';
import { IdeaCloneHeaderActions } from './idea-clone-header-actions';
import { IdeaHeaderStatus } from './idea-header-status';
import type { IdeaCloneView } from './idea-sections';

/** An idea's page header: Ideas, then the idea's title and its state, its actions, and a line saying where it stands. */
export function IdeaCloneHeader({
  ideaName,
  onCloseIdea,
  onEdit,
  onOpenShared,
  onPrimary,
  onResolve,
  pending,
  primary,
  proposalId,
  sharedTripId,
  status,
  tabs,
  trip,
  view
}: {
  ideaName?: string;
  onCloseIdea?: () => void;
  onEdit: () => void;
  onOpenShared: () => void;
  onPrimary: () => void;
  onResolve?: () => void;
  pending?: boolean;
  primary: IdeaPrimaryAction | null;
  proposalId: Id<'tripProposals'>;
  sharedTripId: Id<'trips'>;
  status: IdeaStatus;
  /** The idea's view tabs, shown directly under the header. */
  tabs?: ReactNode;
  trip: TripDetail;
  view: IdeaCloneView;
}) {
  const idea = useOptionalIdeaContext();
  const isDraft = status === 'draft' || status === 'in_review' || status === 'conflicted';
  const facts = [
    isDraft ? 'Draft · not part of the agreed plan' : null,
    view === 'compare' ? 'Reviewing changes' : null,
    trip.permissions.canEdit ? null : 'Read-only'
  ].filter((fact): fact is string => fact !== null);
  const budget = budgetSummary(trip);
  return (
    <Shell.Header
      actions={
        <div
          className="contents"
          data-idea-id={proposalId}
          data-idea-name={ideaName}
          data-testid={testIds.ideaWorkspace}
        >
          <IdeaCloneHeaderActions
            canEdit={trip.permissions.canEdit}
            onCloseIdea={onCloseIdea}
            onEdit={onEdit}
            onOpenShared={onOpenShared}
            onPrimary={onPrimary}
            onResolve={onResolve}
            pending={pending}
            primary={primary}
            proposalId={proposalId}
            sharedTripId={sharedTripId}
            status={status}
            view={view}
          />
        </div>
      }
      meta={
        facts.length > 0 || budget ? (
          <>
            {facts.map((fact) => (
              <span className={SHELL_HEADER_FACT} key={fact}>
                {fact}
              </span>
            ))}
            {/* Like Plan, the budget drops below `lg` so the line never wraps. */}
            {budget ? (
              <span className={cn(SHELL_HEADER_FACT, 'max-lg:hidden')}>{budget}</span>
            ) : null}
          </>
        ) : undefined
      }
      parent={
        <Link params={{ section: 'ideas', tripId: sharedTripId }} to="/trips/$tripId/$section">
          Ideas
        </Link>
      }
      status={<IdeaHeaderStatus status={status} />}
      tabs={tabs}
      title={idea?.proposal?.title ?? trip.name}
      titleProps={{
        'data-testid': testIds.tripHeading,
        'data-trip-id': trip.id,
        'data-trip-name': trip.name
      }}
    />
  );
}
