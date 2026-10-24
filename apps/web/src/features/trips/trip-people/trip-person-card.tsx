import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger
} from '@groam/ui/components/popover';
import { Sheet, SheetContent, SheetTrigger } from '@groam/ui/components/sheet';
import { useIsMobile } from '@groam/ui/hooks/use-mobile';
import type { ReactNode, RefObject } from 'react';
import { useRef, useState } from 'react';
import type { PeopleActions } from '@/types/trip-people';
import type { TripTraveler } from '@/types/trips';
import { TripPersonCardBody } from './trip-person-card-body';

/** The card's face sits 16px in and 16px down; the row's face is 24px, the card's 40px. */
const ALIGN_OFFSET = { bottom: -16, right: -24 } as const;

/** Opening a card lands on the RSVP group's tab stop, not on a payment button. */
function focusTabStop(event: Event) {
  const stop = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(
    '[role="radio"][tabindex="0"]'
  );
  if (!stop) return;
  event.preventDefault();
  stop.focus();
}

/**
 * A person's card. `children` draws the one button that opens it and is given `faceRef`, the
 * element (the face and name) the popover anchors on, so the card's face lands by the row's. It
 * opens as a popover below the person (`side="bottom"`) or beside them (`"right"`, which flips when
 * there is no room), or on phones as a bottom sheet titled with their name and closed by Done.
 */
export function TripPersonCard({
  actions,
  children,
  side = 'bottom',
  traveler
}: {
  actions: PeopleActions;
  children: (parts: { faceRef: RefObject<HTMLSpanElement | null> }) => ReactNode;
  side?: 'bottom' | 'right';
  traveler: TripTraveler;
}) {
  const [open, setOpen] = useState(false);
  const faceRef = useRef<HTMLSpanElement>(null);
  const isMobile = useIsMobile();
  const body = (sheet: boolean) => (
    <TripPersonCardBody
      actions={actions}
      onClose={() => setOpen(false)}
      sheet={sheet}
      traveler={traveler}
    />
  );
  return isMobile ? (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>{children({ faceRef })}</SheetTrigger>
      <SheetContent
        aria-describedby={undefined}
        className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl border-t border-border p-0 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
        hideCloseButton
        onOpenAutoFocus={focusTabStop}
        side="bottom"
      >
        {body(true)}
      </SheetContent>
    </Sheet>
  ) : (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverAnchor virtualRef={faceRef} />
      <PopoverTrigger asChild>{children({ faceRef })}</PopoverTrigger>
      <PopoverContent
        align="start"
        alignOffset={ALIGN_OFFSET[side]}
        aria-label={traveler.name}
        className="max-h-(--radix-popover-content-available-height) w-80 overflow-y-auto p-0 motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none"
        collisionPadding={8}
        onOpenAutoFocus={focusTabStop}
        side={side}
        sideOffset={side === 'right' ? 12 : 4}
      >
        {body(false)}
      </PopoverContent>
    </Popover>
  );
}
