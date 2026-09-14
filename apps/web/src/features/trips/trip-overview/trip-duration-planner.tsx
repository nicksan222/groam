import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { Calendar } from '@groam/ui/components/calendar';
import { IconTile } from '@groam/ui/components/icon-tile';
import { Label } from '@groam/ui/components/label';
import { PageLoading } from '@groam/ui/components/page-loading';
import { Popover, PopoverContent, PopoverTrigger } from '@groam/ui/components/popover';
import Shell from '@groam/ui/components/shell/client';
import { Spinner } from '@groam/ui/components/spinner';
import { dateFromString, displayDate } from '@groam/ui/lib/calendar-date';
import { CalendarDays, CalendarRange, Check, Sparkles } from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { startIdeaCta } from '@/features/ideas/idea-list/idea-page-copy';
import { useTripDurationPlanner } from '@/features/trips/hooks/use-trip-duration-planner';
import { testIds } from '@/lib/test-ids';

function durationLabel(days: number) {
  return `${days} day${days === 1 ? '' : 's'}`;
}

function durationAccessBadge(canEdit: boolean, canPropose: boolean) {
  if (canEdit) return null;
  return (
    <Badge className="font-medium" variant="secondary">
      {canPropose ? 'Shared' : 'Read-only'}
    </Badge>
  );
}

function durationDescription(canEdit: boolean, canPropose: boolean) {
  if (canEdit) return 'Choose when the trip starts and ends. Duration is calculated automatically.';
  if (canPropose) {
    return 'Everyone sees these dates. Start an idea to try others — the shared trip stays put.';
  }
  return 'These dates cannot be edited on the shared trip.';
}

function durationFooterCopy({
  canEdit,
  days,
  from,
  isValid,
  minimum,
  startIdea,
  to
}: {
  canEdit: boolean;
  days: number;
  from: string;
  isValid: boolean;
  minimum: number;
  startIdea: boolean;
  to: string;
}) {
  if (canEdit) {
    if (isValid) return durationLabel(days);
    if (from && to) return `Choose a range between ${minimum} and 365 days.`;
    return 'Select both dates to set the trip length.';
  }
  if (startIdea) {
    return isValid
      ? `${durationLabel(days)}. Start an idea to try other dates without changing the shared trip.`
      : 'Start an idea to try other dates without changing the shared trip.';
  }
  return isValid ? durationLabel(days) : 'Dates are not set.';
}

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type TripDurationPlannerLoadedProps = {
  canEdit: boolean;
  canPropose?: boolean;
  isLoading?: false;
  minimumDays: number;
  onSave: (days: number, startDate: string | undefined) => Promise<boolean>;
  onStartVersion?: () => void;
  startDate: null | string;
  totalDays: number | null;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type TripDurationPlannerLoadingProps = {
  isLoading: true;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type TripDurationPlannerProps =
  | TripDurationPlannerLoadedProps
  | TripDurationPlannerLoadingProps;

export function TripDurationPlanner(props: TripDurationPlannerProps) {
  if (props.isLoading) return <PageLoading label="Loading trip dates…" />;
  return <TripDurationPlannerLoaded {...props} />;
}

function TripDurationPlannerLoaded({
  canEdit,
  canPropose = false,
  minimumDays,
  onSave,
  onStartVersion,
  startDate,
  totalDays
}: TripDurationPlannerLoadedProps) {
  const fieldId = useId();
  const {
    days,
    from,
    hasChanged,
    isPending,
    isValid,
    minimum,
    openField,
    save,
    selectRange,
    setOpenField,
    to
  } = useTripDurationPlanner({ minimumDays, onSave, startDate, totalDays });
  const selectedRange = { from: dateFromString(from), to: dateFromString(to) };
  const calendar = (
    <Calendar
      defaultMonth={selectedRange.from}
      max={364}
      min={Math.max(0, minimum - 1)}
      mode="range"
      numberOfMonths={2}
      onSelect={selectRange}
      selected={selectedRange}
    />
  );
  const startIdea = Boolean(canPropose && onStartVersion && !canEdit);

  return (
    <Shell.Card data-testid={testIds.tripDates} padding="sm" stack="sm" variant="panel">
      <div className="flex items-start gap-2.5">
        <IconTile className="size-7" radius="md" size="xs" variant="outline">
          <CalendarRange className="size-3.5" />
        </IconTile>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Trip dates</h2>
            {durationAccessBadge(canEdit, canPropose)}
          </div>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            {durationDescription(canEdit, canPropose)}
          </p>
        </div>
      </div>

      {canEdit ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <TripDateField
            calendar={calendar}
            date={selectedRange.from}
            disabled={isPending}
            id={`${fieldId}-start`}
            label="Start"
            onOpenChange={(open) => setOpenField(open ? 'start' : null)}
            open={openField === 'start'}
            placeholder="Choose start date"
          />
          <TripDateField
            calendar={calendar}
            date={selectedRange.to}
            disabled={isPending}
            id={`${fieldId}-end`}
            label="End"
            onOpenChange={(open) => setOpenField(open ? 'end' : null)}
            open={openField === 'end'}
            placeholder="Choose end date"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <TripDateReadout date={selectedRange.from} label="Start" />
          <TripDateReadout date={selectedRange.to} label="End" />
        </div>
      )}

      <Shell.CardFooter density="inset">
        <p
          className={`min-w-0 text-xs leading-4 ${canEdit && from && to && !isValid ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {durationFooterCopy({
            canEdit,
            days,
            from,
            isValid,
            minimum,
            startIdea,
            to
          })}
        </p>
        {canEdit ? (
          <Button
            data-testid={testIds.tripDatesSave}
            disabled={isPending || !hasChanged}
            onClick={() => void save()}
            size="sm"
            type="button"
          >
            {isPending ? <Spinner /> : <Check />}
            {hasChanged ? 'Save dates' : 'Saved'}
          </Button>
        ) : startIdea ? (
          <Button
            data-testid={testIds.startIdea}
            onClick={onStartVersion}
            size="sm"
            type="button"
            variant="outline"
          >
            <Sparkles />
            {startIdeaCta}
          </Button>
        ) : null}
      </Shell.CardFooter>
    </Shell.Card>
  );
}

function TripDateReadout({ date, label }: { date: Date | undefined; label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate rounded-md border border-border px-3 py-1.5 text-sm font-medium">
        {date ? displayDate.format(date) : 'Not set'}
      </p>
    </div>
  );
}

function TripDateField({
  calendar,
  date,
  disabled,
  id,
  label,
  onOpenChange,
  open,
  placeholder
}: {
  calendar: ReactNode;
  date: Date | undefined;
  disabled: boolean;
  id: string;
  label: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  placeholder: string;
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Popover onOpenChange={onOpenChange} open={open}>
        <PopoverTrigger asChild>
          <Button
            aria-label={`Choose ${label.toLowerCase()} date`}
            className="h-9 w-full justify-start px-3 text-left font-normal"
            data-testid={label === 'Start' ? testIds.tripDatesStart : testIds.tripDatesEnd}
            disabled={disabled}
            id={id}
            variant="outline"
          >
            <CalendarDays className="size-4 text-muted-foreground" />
            {date ? (
              <span>{displayDate.format(date)}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto overflow-x-auto p-0">
          {open ? calendar : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
