import type { Id } from '@groam/backend/data-model';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
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

const ASSIGNABLE_STATUSES = [
  { id: 'going', label: 'Going' },
  { id: 'maybe', label: 'Maybe' },
  { id: 'not_going', label: 'Not going' }
] as const;

export function TripTravelersSheet({
  onOpenChange,
  open,
  tripId,
  tripName
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  tripId: Id<'trips'>;
  tripName: string;
}) {
  const { session } = useWorkspace();
  const { setStatus, travelers } = useTripTravelers(open ? tripId : undefined);

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="h-dvh w-full max-w-none overflow-y-auto sm:max-w-lg"
        data-testid={testIds.tripTravelers}
      >
        <SheetHeader>
          <SheetTitle>Travelers</SheetTitle>
          <SheetDescription>
            Everyone in this group is on {tripName}. Update RSVPs here.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-2 px-4 pb-4">
          {travelers.map((traveler) => {
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
                  <p className="truncate text-xs text-muted-foreground">{traveler.email}</p>
                </div>
                <Select
                  onValueChange={(value) =>
                    void setStatus(value as 'going' | 'maybe' | 'not_going', traveler.userId)
                  }
                  value={traveler.status}
                >
                  <SelectTrigger className="h-8 w-[7.5rem] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_STATUSES.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
