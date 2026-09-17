import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { Progress } from '@groam/ui/components/progress';
import Shell from '@groam/ui/components/shell/client';
import { cn } from '@groam/ui/lib/utils';
import { ArrowRight, Check, Circle, ListChecks } from 'lucide-react';
import { type NextStep, nextStepFor } from '@/features/trips/hooks/trip-overview-next-step';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { TripArchiveButton } from './trip-archive-button';
import { TripCalendarExportButton } from './trip-calendar-export-button';

const readinessLabels = ['Destination', 'Travel window', 'Trip length'] as const;

const initialNextStep: NextStep = nextStepFor({
  hasDestination: false,
  hasDuration: false,
  hasTravelWindow: false,
  onAddDestination: () => undefined,
  onEditDetails: () => undefined,
  onOpenItinerary: () => undefined
});

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type PlanningReadinessLoadedProps = {
  completedSteps: number;
  isLoading?: false;
  nextStep: NextStep;
  onEditDetails: () => void;
  onOpenItinerary: () => void;
  states: {
    hasDestination: boolean;
    hasDuration: boolean;
    hasTravelWindow: boolean;
  };
  trip?: TripDetail;
  tripState?: TripState;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type PlanningReadinessLoadingProps = {
  isLoading: true;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type PlanningReadinessProps = PlanningReadinessLoadedProps | PlanningReadinessLoadingProps;

export function PlanningReadiness(props: PlanningReadinessProps) {
  if (props.isLoading) {
    return (
      <Shell.Card aria-busy="true" stack="md" variant="panel">
        <Shell.SectionHeader
          density="compact"
          description="Set the core trip details the group needs."
          icon={ListChecks}
          title="Trip basics"
          trailing={
            <Badge className="tabular-nums" variant="secondary">
              —
            </Badge>
          }
        />
        <div className="flex items-end justify-between gap-3">
          <p className="text-sm text-muted-foreground">Checking trip details…</p>
          <span className="text-sm font-semibold tabular-nums">—</span>
        </div>
        <Progress className="h-1.5" value={0} />
        <Shell.Card variant="inset">
          {readinessLabels.map((label, index) => (
            <div
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm',
                index > 0 && 'border-t border-border'
              )}
              key={label}
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full border border-border text-muted-foreground">
                <Circle className="size-2 fill-current" />
              </span>
              <span className="text-muted-foreground">{label}</span>
              <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
            </div>
          ))}
        </Shell.Card>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{initialNextStep.title}</p>
          <Button className="w-full" disabled size="sm">
            {initialNextStep.action}
            <ArrowRight />
          </Button>
        </div>
      </Shell.Card>
    );
  }

  const { completedSteps, nextStep, onEditDetails, onOpenItinerary, states, trip, tripState } =
    props;
  const items = [
    { complete: states.hasDestination, label: 'Destination', onClick: onOpenItinerary },
    { complete: states.hasTravelWindow, label: 'Travel window', onClick: onEditDetails },
    { complete: states.hasDuration, label: 'Trip length', onClick: onEditDetails }
  ];
  return (
    <Shell.Card stack="md" variant="panel">
      <Shell.SectionHeader
        density="compact"
        description="Set the core trip details the group needs."
        icon={ListChecks}
        title="Trip basics"
        trailing={
          <Badge className="tabular-nums" variant="secondary">
            {completedSteps}/3
          </Badge>
        }
      />
      <div className="flex items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">{completedSteps} of 3 complete</p>
        <span className="text-sm font-semibold tabular-nums">
          {Math.round((completedSteps / 3) * 100)}%
        </span>
      </div>
      <Progress className="h-1.5" value={(completedSteps / 3) * 100} />
      <Shell.Card variant="inset">
        {items.map((item, index) => (
          <Button
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-foreground/[0.03]',
              index > 0 && 'border-t border-border'
            )}
            key={item.label}
            onClick={item.onClick}
            type="button"
            unstyled
          >
            <span
              className={
                item.complete
                  ? 'grid size-5 place-items-center rounded-full border border-foreground/20 bg-foreground text-background'
                  : 'grid size-5 place-items-center rounded-full border border-border text-muted-foreground'
              }
            >
              {item.complete ? (
                <Check className="size-3" />
              ) : (
                <Circle className="size-2 fill-current" />
              )}
            </span>
            <span className={item.complete ? 'font-medium' : 'text-muted-foreground'}>
              {item.label}
            </span>
            {!item.complete && <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />}
          </Button>
        ))}
      </Shell.Card>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{nextStep.title}</p>
        <Button className="w-full" onClick={nextStep.onClick} size="sm">
          {nextStep.action}
          <ArrowRight />
        </Button>
      </div>
      {trip && !trip.proposal ? <TripCalendarExportButton trip={trip} /> : null}
      {trip && tripState ? <TripArchiveButton trip={trip} tripState={tripState} /> : null}
    </Shell.Card>
  );
}
