import type { Id } from '@groam/backend/data-model';
import { Users } from '@groam/icons';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { DashedEmpty } from '@groam/ui/components/dashed-empty';
import { LoadingPlaceholder } from '@groam/ui/components/loading-placeholder';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@groam/ui/components/sheet';
import { initials } from '@groam/ui/lib/avatar';
import { useTripTravelers } from '@/features/trips/hooks/use-trip-travelers';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { TripPaymentsPanel } from './trip-payments-panel';

const ASSIGNABLE_STATUSES = [
  { id: 'going', label: 'Going' },
  { id: 'maybe', label: 'Maybe' },
  { id: 'not_going', label: 'Not going' }
] as const;

export function TripTravelersSheet({
  archived = false,
  canManageOthers = false,
  onOpenChange,
  open,
  tripId,
  tripName
}: {
  /** Archived trips are read-only on the server. */
  archived?: boolean;
  /** Only organizers may change other travelers' RSVPs. */
  canManageOthers?: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  tripId: Id<'trips'>;
  tripName: string;
}) {
  const { session } = useWorkspace();
  const { isLoading, setStatus, travelers } = useTripTravelers(open ? tripId : undefined);

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="h-dvh w-full max-w-none overflow-y-auto sm:max-w-lg"
        data-testid={testIds.tripTravelers}
      >
        <SheetHeader>
          <SheetTitle>Travelers</SheetTitle>
          <SheetDescription>
            {archived
              ? `Everyone in this group is on ${tripName}. RSVPs are locked while the trip is archived.`
              : `Everyone in this group is on ${tripName}. Update RSVPs here.`}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-2 px-4 pb-4">
          {isLoading ? (
            <LoadingPlaceholder bordered label="Loading travelers…" />
          ) : travelers.length === 0 ? (
            <DashedEmpty icon={Users} title="No travelers yet">
              Members of this group show up here once they join.
            </DashedEmpty>
          ) : (
            travelers.map((traveler) => {
              const isYou = traveler.userId === session.user.id;
              return (
                <div
                  className="flex min-w-0 items-center gap-3 rounded-md border border-border px-3 py-2"
                  key={traveler.id}
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage alt={traveler.name} src={traveler.image ?? ''} />
                    <AvatarFallback>{initials(traveler.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {traveler.name}
                      {isYou ? ' (you)' : ''}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{traveler.handle}</p>
                  </div>
                  <Select
                    disabled={archived || !(isYou || canManageOthers)}
                    onValueChange={(value) =>
                      void setStatus(
                        value as (typeof ASSIGNABLE_STATUSES)[number]['id'],
                        traveler.userId
                      )
                    }
                    value={traveler.status}
                  >
                    <SelectTrigger
                      aria-label={isYou ? 'Your RSVP' : `RSVP for ${traveler.name}`}
                      className="h-8 w-[7.5rem] shrink-0"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {traveler.status === 'invited' && (
                        <SelectItem disabled value="invited">
                          Invited
                        </SelectItem>
                      )}
                      {ASSIGNABLE_STATUSES.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })
          )}
          {!isLoading && travelers.length > 0 && (
            <TripPaymentsPanel canManageOthers={canManageOthers} tripId={tripId} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
