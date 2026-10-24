import {
  ArrowRight,
  Calendar,
  Clock3,
  Lightbulb,
  MapPin,
  Plus,
  UserPlus,
  Wallet
} from '@groam/icons';
import { Badge } from '@groam/ui/components/badge';
import Shell from '@groam/ui/components/shell/client';
import { useIsNarrow } from '@groam/ui/hooks/use-mobile';
import { cn } from '@groam/ui/lib/utils';
import type { ComponentProps, ComponentType } from 'react';
import { ideaCreateCta, ideaPackingCta, ideaPlanCta } from '@/features/ideas/idea-glossary';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { budgetSummary } from '@/features/trips/trip-overview/trip-budget-label';
import {
  type TripTabSection,
  tripSectionConfig,
  tripSectionTitle
} from '@/features/trips/trip-sections';
import { Link } from '@/features/workspace/navigation/router';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { useParams } from '@/lib/navigation/router';
import { useTripCreateRequestStore } from '@/lib/stores/trip-create-request-store';
import { testIds } from '@/lib/test-ids';
import type { SectionAction, TripCreateKind } from '@/types/trips';
import type { TripState } from './trip-detail-types';
import { TripGoingLink } from './trip-going-link';
import { TripListActions } from './trip-list-actions';
import { TripNavigationActions } from './trip-navigation-actions';
import { tripToolbarFacts } from './trip-toolbar-facts';

const createLabels: Record<Exclude<TripCreateKind, 'idea'>, { label: string; testId?: string }> = {
  issue: { label: 'New issue', testId: testIds.newIssue },
  poll: { label: 'New poll', testId: testIds.newPoll },
  research: { label: 'New research', testId: testIds.researchCreate }
};

/** One fact as a pill: a quiet icon and the value. */
function FactPill({
  children,
  icon: Icon,
  className,
  ...rest
}: ComponentProps<'span'> & { icon: ComponentType<{ className?: string }> }) {
  return (
    <Badge className={cn('gap-2 font-normal', className)} variant="secondary" {...rest}>
      <Icon aria-hidden className="text-muted-foreground" />
      <span className="truncate">{children}</span>
    </Badge>
  );
}

/** Plan's description line: where, when, how long, and what it costs as pills; below `lg`, who is going too. */
function PlanDescription({ trip, tripReference }: { trip: TripDetail; tripReference: string }) {
  const narrow = useIsNarrow();
  const facts = tripToolbarFacts(trip);
  const budget = budgetSummary(trip);
  return (
    // The facts row starts one dot slot left of its clip edge; pills have no dot, so step back in.
    <span className="flex min-w-0 max-w-full flex-wrap items-center gap-2 pl-4 max-lg:flex-nowrap max-lg:overflow-hidden">
      <FactPill
        className="max-sm:hidden"
        data-destination-status={trip.destination.status}
        data-testid={testIds.tripDestination}
        icon={MapPin}
      >
        {facts.destination}
      </FactPill>
      <FactPill className="max-sm:min-w-0" icon={Calendar}>
        {facts.window}
      </FactPill>
      {facts.length ? (
        <FactPill className="max-lg:hidden" icon={Clock3}>
          {facts.length}
        </FactPill>
      ) : null}
      {budget ? (
        <FactPill className="max-lg:hidden" icon={Wallet}>
          {budget}
        </FactPill>
      ) : null}
      {narrow ? (
        <span className="flex shrink-0 items-center">
          <TripGoingLink compact trip={trip} tripReference={tripReference} />
        </span>
      ) : null}
    </span>
  );
}

/** The trip's name before the section title: plain text on Plan, a link to Plan everywhere else. */
function TripCrumb({
  onPlan,
  trip,
  tripReference
}: {
  onPlan: boolean;
  trip: TripDetail;
  tripReference: string;
}) {
  if (onPlan) return trip.name;
  return (
    <Link
      className="underline-offset-4 hover:underline"
      params={{ section: 'plan', tripId: tripReference }}
      to="/trips/$tripId/$section"
    >
      {trip.name}
    </Link>
  );
}

/** Whether the viewer may start this kind of thing on this trip. */
function canCreate(kind: SectionAction, trip: TripDetail, canManageGroup: boolean) {
  if (kind === 'invite') return canManageGroup;
  if (trip.archivedAt !== null) return false;
  return kind === 'idea' ? trip.permissions.canPropose : true;
}

/** The header's creation button, if the section offers one. The section body owns the dialogs. */
function PrimaryAction({
  ideaLabel,
  kind,
  onStartIdea,
  startingIdea
}: {
  /** What the idea button says; Plan and Calendar phrase it as a change to the agreed plan. */
  ideaLabel: string;
  kind: SectionAction | undefined;
  onStartIdea?: () => void;
  startingIdea: boolean;
}) {
  const request = useTripCreateRequestStore((state) => state.request);
  const openDialog = useWorkspaceDialogs((state) => state.openDialog);
  if (kind === undefined) return null;
  if (kind === 'invite') {
    return (
      <Shell.Action
        data-testid={testIds.tripPeopleInvite}
        icon={UserPlus}
        label="Invite to group"
        onClick={() => openDialog('invite')}
      />
    );
  }
  if (kind === 'idea') {
    // Starting a change leads on into the idea (a trailing arrow on desktop); every other button adds
    // something (a plus). On phones both are one icon: the idea's lightbulb, or a plus.
    const suggesting = ideaLabel === ideaPlanCta || ideaLabel === ideaPackingCta;
    return (
      <Shell.Action
        data-testid={testIds.sharedTripNewIdea}
        desktopIcon={suggesting ? ArrowRight : Plus}
        desktopIconEnd={suggesting}
        disabled={startingIdea}
        icon={suggesting ? Lightbulb : Plus}
        label={ideaLabel}
        onClick={onStartIdea}
      />
    );
  }
  const { label, testId } = createLabels[kind];
  return (
    <Shell.Action data-testid={testId} icon={Plus} label={label} onClick={() => request(kind)} />
  );
}

/** A shared trip's page header: trip name and section title, then going, the trip actions menu, and the section's one creation button. */
export function TripSectionHeader({
  onEdit,
  onStartIdea,
  section,
  startingIdea = false,
  trip,
  tripState
}: {
  onEdit: () => void;
  onStartIdea?: () => void;
  section: TripTabSection;
  startingIdea?: boolean;
  trip: TripDetail;
  tripState: TripState;
}) {
  const archived = trip.archivedAt !== null;
  const config = tripSectionConfig[section];
  const { primaryAction } = config;
  const { activeRole } = useWorkspace();
  const canManageGroup = activeRole === 'owner' || activeRole === 'admin';
  const offered =
    primaryAction && canCreate(primaryAction, trip, canManageGroup) ? primaryAction : undefined;
  const ideaInMenu = canCreate('idea', trip, canManageGroup) && offered !== 'idea';
  const { tripId: tripReference = trip.id } = useParams<{ tripId: string }>();
  const showGoing = !useIsNarrow() && section !== 'people';

  return (
    <Shell.Header
      actions={
        <>
          <TripNavigationActions
            onEdit={onEdit}
            onStartIdea={ideaInMenu ? onStartIdea : undefined}
            section={section}
            trip={trip}
            tripState={tripState}
          />
          <TripListActions section={section} />
          <PrimaryAction
            ideaLabel={config.primaryActionLabel ?? ideaCreateCta}
            kind={offered}
            onStartIdea={onStartIdea}
            startingIdea={startingIdea}
          />
        </>
      }
      lead={showGoing ? <TripGoingLink trip={trip} tripReference={tripReference} /> : null}
      meta={
        section === 'plan' ? (
          <PlanDescription trip={trip} tripReference={tripReference} />
        ) : undefined
      }
      notice={
        archived ? (
          <p
            className="px-4 pb-3 text-xs text-muted-foreground md:px-6"
            data-testid={testIds.sharedTripBanner}
          >
            Archived · read-only until restored
          </p>
        ) : null
      }
      parentKind="trip"
      parent={<TripCrumb onPlan={section === 'plan'} trip={trip} tripReference={tripReference} />}
      title={tripSectionTitle(section)}
      titleProps={{
        'data-testid': testIds.tripHeading,
        'data-trip-id': trip.id,
        'data-trip-name': trip.name
      }}
    />
  );
}
