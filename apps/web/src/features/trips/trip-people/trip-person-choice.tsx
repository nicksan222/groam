import { Check, Clock3 } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { moveRadioFocus } from '@groam/ui/lib/roving-radio';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import { useId } from 'react';
import type { ChoiceModel } from '@/types/trip-people';
import type { AssignableStatus } from '@/types/trips';
import type { rsvpOptions } from './trip-rsvp-options';

const TILES = {
  going: 'bg-success/20 text-success-foreground',
  held: 'bg-warning/20 text-warning-foreground',
  maybe: 'bg-primary/15 text-primary',
  not_going: 'bg-transparent text-foreground ring-1 ring-input ring-inset',
  rest: 'bg-muted text-muted-foreground'
} as const;

/**
 * One RSVP in a person's card: a tinted icon tile, the label, and one line on what it means. The
 * checked row carries the primary wash and ring, its tile takes the answer's tint, and a check sits
 * at the right (a spinner while it saves, a pop once it has). A held Going (said yes, no seat) is
 * checked with a clock; a blocked one is faded with its reason readable. `seat` is the Pay or Cover
 * button, which lives in the row beside the radio, never inside it.
 */
export function TripPersonChoice({
  busy,
  chosen,
  dimmed,
  locked,
  model,
  onSelect,
  option,
  saved,
  seat,
  tabStop
}: {
  /** This is the choice being saved. */
  busy: boolean;
  /** Reads as the checked row: their answer, or the pick that is saving or saved. */
  chosen: boolean;
  /** Another pick is saving or saved: this row steps back. */
  dimmed: boolean;
  /** Another choice is saving; this one waits without losing focus. */
  locked: boolean;
  model: ChoiceModel;
  onSelect: (status: AssignableStatus) => void;
  option: (typeof rsvpOptions)[number];
  /** This pick has just saved: the check pops in. */
  saved: boolean;
  seat?: ReactNode;
  tabStop: boolean;
}) {
  const labelId = useId();
  const consequenceId = useId();
  const disabled = model.kind === 'held' || model.kind === 'blocked';
  const held = model.kind === 'held' && chosen;
  const faded = model.kind === 'blocked';
  return (
    <div
      className={cn(
        'flex items-center rounded-lg transition-[background-color,opacity] motion-reduce:transition-none',
        chosen ? 'bg-primary/10 ring-1 ring-primary/25 ring-inset' : 'hover:bg-muted/60',
        dimmed && 'opacity-50',
        disabled && !chosen && 'hover:bg-transparent'
      )}
    >
      <Button
        aria-checked={chosen}
        aria-describedby={consequenceId}
        aria-disabled={locked || undefined}
        aria-labelledby={labelId}
        className={cn(
          'flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'cursor-default'
        )}
        data-rsvp={option.id}
        disabled={disabled}
        onClick={() => {
          if (!locked && !chosen) onSelect(option.id);
        }}
        onKeyDown={moveRadioFocus}
        {...{ role: 'radio' }}
        tabIndex={tabStop ? 0 : -1}
        type="button"
        unstyled
      >
        <ChoiceTile chosen={chosen} faded={faded} held={held} option={option} />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-sm font-medium text-foreground',
              faded && 'text-muted-foreground opacity-60'
            )}
            id={labelId}
          >
            {option.label}
          </span>
          <span className="block text-xs text-muted-foreground" id={consequenceId}>
            {model.consequence}
          </span>
        </span>
        {chosen && !held && !busy ? (
          <Check
            aria-hidden
            className={cn('size-4 shrink-0 text-primary', saved && 'people-check-pop')}
          />
        ) : null}
      </Button>
      {busy ? (
        <Spinner
          aria-label="Saving"
          className="mr-3 size-4 shrink-0 text-muted-foreground motion-reduce:animate-none"
        />
      ) : null}
      {seat ? <span className="shrink-0 pr-2">{seat}</span> : null}
    </div>
  );
}

/** The 28px icon tile: tinted once the row is checked, a clock while Going is held. */
function ChoiceTile({
  chosen,
  faded,
  held,
  option
}: {
  chosen: boolean;
  faded: boolean;
  held: boolean;
  option: (typeof rsvpOptions)[number];
}) {
  const Icon = held ? Clock3 : option.icon;
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-md [&>svg]:size-4',
        chosen ? TILES[held ? 'held' : option.id] : TILES.rest,
        faded && 'opacity-60'
      )}
    >
      <Icon />
    </span>
  );
}
