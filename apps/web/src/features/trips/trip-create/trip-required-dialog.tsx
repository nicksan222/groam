import { Button } from '@groam/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { MapPin } from 'lucide-react';
import { Link } from '@/features/workspace/navigation/router';

export function TripRequiredDialog({
  open,
  onClose,
  purpose
}: {
  open: boolean;
  onClose: () => void;
  purpose: 'idea' | 'issue';
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <MapPin className="size-5" />
        </div>
        <DialogHeader>
          <DialogTitle>Start with a trip</DialogTitle>
          <DialogDescription>
            {purpose === 'idea'
              ? 'Ideas suggest changes to a shared trip.'
              : 'Issues keep decisions and questions attached to a trip.'}{' '}
            Create a trip, or restore an archived one, then return here.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button asChild>
            <Link to="/trips" onClick={onClose}>
              Go to trips
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
