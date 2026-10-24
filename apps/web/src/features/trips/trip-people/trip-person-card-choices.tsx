import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { useEffect, useRef, useState } from 'react';
import type { PeopleActions } from '@/types/trip-people';
import type { AssignableStatus, TripTraveler } from '@/types/trips';
import { choiceModels } from './trip-person-card-model';
import { TripPersonChoice } from './trip-person-choice';
import { firstName } from './trip-roster-groups';
import { rsvpOptions } from './trip-rsvp-options';
import { TripSeatButton } from './trip-seat-button';

/** How long the saved check stays in view before the card closes. */
const HOLD_MS = 300;

function holdMs() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : HOLD_MS;
}

/**
 * The card's choices: a radio group of Going, Maybe and Not going. Arrow keys move focus, Enter or
 * Space picks. A pick reads as checked at once and the others step back and wait; once it saves the
 * check pops in, holds a beat, and `onDone` closes the card. A failed pick puts the rows back and
 * says so right here, since a toast can sit behind a phone's sheet.
 */
export function TripPersonCardChoices({
  actions,
  isYou,
  onDone,
  traveler
}: {
  actions: PeopleActions;
  isYou: boolean;
  onDone: () => void;
  traveler: TripTraveler;
}) {
  const action = useAsyncAction();
  // The pick last sent; it only counts as pending while the action is in flight.
  const [picked, setPicked] = useState<AssignableStatus | null>(null);
  const pending = action.isPending ? picked : null;
  const [saved, setSaved] = useState<AssignableStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(closing.current), []);

  const models = choiceModels(traveler, actions, isYou);
  const shown = saved ?? pending;
  const enabled = models.filter((model) => model.kind === 'checked' || model.kind === 'open');
  const tabStop = enabled.find((model) => model.kind === 'checked') ?? enabled[0];
  const { seats } = actions;

  const select = async (status: AssignableStatus) => {
    setFailed(false);
    const outcome = await action.run(() => {
      setPicked(status);
      return actions.onChange(status, traveler.userId);
    });
    if (outcome.status === 'ignored') return;
    if (outcome.status === 'error' || !outcome.value) {
      setFailed(true);
      return;
    }
    setSaved(status);
    actions.arrive(traveler.userId, status);
    closing.current = setTimeout(onDone, holdMs());
  };

  return (
    <div className="flex flex-col gap-1 border-t border-border p-2">
      <div
        aria-busy={pending !== null}
        aria-label={`RSVP for ${traveler.name}`}
        className="flex flex-col gap-1"
        role="radiogroup"
      >
        {rsvpOptions.map((option, index) => {
          const model = models[index];
          if (!model) return null;
          return (
            <TripPersonChoice
              busy={pending === option.id}
              chosen={
                shown === null
                  ? model.kind === 'checked' || model.kind === 'held'
                  : shown === option.id
              }
              dimmed={shown !== null && shown !== option.id}
              key={option.id}
              locked={shown !== null}
              model={model}
              onSelect={(status) => void select(status)}
              option={option}
              saved={saved === option.id}
              seat={
                model.seat && seats ? (
                  <TripSeatButton
                    disabled={seats.disabled || seats.pendingUserId !== null}
                    isYou={isYou}
                    name={traveler.name}
                    onPay={() => seats.onPay(traveler.userId)}
                    pending={seats.pendingUserId === traveler.userId}
                  />
                ) : undefined
              }
              tabStop={model === tabStop}
            />
          );
        })}
      </div>
      {failed ? (
        <p className="px-3 pt-1 pb-1 text-sm text-destructive" role="alert">
          Couldn’t change {isYou ? 'your answer' : `${firstName(traveler.name)}’s answer`}. Try
          again.
        </p>
      ) : null}
    </div>
  );
}
