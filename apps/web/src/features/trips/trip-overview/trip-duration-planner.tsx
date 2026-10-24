import { CalendarDays, CalendarRange, Check, Sparkles } from '@groam/icons';
import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { Calendar } from '@groam/ui/components/calendar';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import { Heading } from '@groam/ui/components/heading';
import { IconTile } from '@groam/ui/components/icon-tile';
import { PageLoading } from '@groam/ui/components/page-loading';
import { Popover, PopoverContent, PopoverTrigger } from '@groam/ui/components/popover';
import Shell from '@groam/ui/components/shell/client';
import { dateFromString, displayDate } from '@groam/ui/lib/calendar-date';
import type { ReactNode } from 'react';
import { startIdeaCta } from '@/features/ideas/idea-page-copy';
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

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
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

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type TripDurationPlannerLoadingProps = {
  isLoading: true;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
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
  const {
    days,
    error,
    from,
    handleSubmit,
    hasChanged,
    isPending,
    isValid,
    minimum,
    openField,
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
  const footerCopy = durationFooterCopy({
    canEdit,
    days,
    from,
    isValid,
    minimum,
    startIdea,
    to
  });
  const footerTone = canEdit && from && to && !isValid ? 'text-destructive' : undefined;

  return (
    <Shell.Card data-testid={testIds.tripDates} padding="sm" stack="sm" variant="panel">
      <div className="flex items-start gap-3">
        <IconTile className="size-7" radius="md" size="xs" variant="outline">
          <CalendarRange className="size-3.5" />
        </IconTile>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Heading level={2} size="sm" className="text-foreground">
              Trip dates
            </Heading>
            {durationAccessBadge(canEdit, canPropose)}
          </div>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            {durationDescription(canEdit, canPropose)}
          </p>
        </div>
      </div>

      {canEdit ? (
        <Form
          actions={
            <Shell.CardFooter density="inset">
              <FormActions
                className="w-full"
                hint={<span className={footerTone}>{footerCopy}</span>}
                isPending={isPending}
                size="sm"
                submitDisabled={!hasChanged}
                submitIcon={<Check />}
                submitLabel={hasChanged ? 'Save dates' : 'Saved'}
                submitTestId={testIds.tripDatesSave}
              />
            </Shell.CardFooter>
          }
          className="gap-2"
          error={error}
          isPending={isPending}
          onSubmit={handleSubmit}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <TripDateField
              calendar={calendar}
              date={selectedRange.from}
              disabled={isPending}
              label="Start"
              onOpenChange={(open) => setOpenField(open ? 'start' : null)}
              open={openField === 'start'}
              placeholder="Choose start date"
            />
            <TripDateField
              calendar={calendar}
              date={selectedRange.to}
              disabled={isPending}
              label="End"
              onOpenChange={(open) => setOpenField(open ? 'end' : null)}
              open={openField === 'end'}
              placeholder="Choose end date"
            />
          </div>
        </Form>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <TripDateReadout date={selectedRange.from} label="Start" />
            <TripDateReadout date={selectedRange.to} label="End" />
          </div>
          <Shell.CardFooter density="inset">
            <p className="min-w-0 text-xs leading-4 text-muted-foreground">{footerCopy}</p>
            {startIdea ? (
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
        </>
      )}
    </Shell.Card>
  );
}

function TripDateReadout({ date, label }: { date: Date | undefined; label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate rounded-md border border-border px-3 py-2 text-sm font-medium">
        {date ? displayDate.format(date) : 'Not set'}
      </p>
    </div>
  );
}

function TripDateField({
  calendar,
  date,
  disabled,
  label,
  onOpenChange,
  open,
  placeholder
}: {
  calendar: ReactNode;
  date: Date | undefined;
  disabled: boolean;
  label: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  placeholder: string;
}) {
  return (
    <FormField className="min-w-0" label={label}>
      <DateTrigger
        calendar={calendar}
        date={date}
        disabled={disabled}
        label={label}
        onOpenChange={onOpenChange}
        open={open}
        placeholder={placeholder}
      />
    </FormField>
  );
}

/** The date button and its calendar popover; takes the `id` FormField generates. */
function DateTrigger({
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
  id?: string;
  label: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  placeholder: string;
}) {
  return (
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
      <PopoverContent align="start" className="w-auto overflow-auto p-0">
        {open ? calendar : null}
      </PopoverContent>
    </Popover>
  );
}
