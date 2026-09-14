import { Button } from '@groam/ui/components/button';
import { Trash2 } from 'lucide-react';
import type { TransferView } from '@/features/trips/trip-transfer-options';
import type { TransferForm } from './transfer-form-types';

export function TransferRemoval({
  hasChanges,
  initial,
  isBusy,
  onRemove,
  status
}: {
  hasChanges: boolean;
  initial: null | TransferView;
  isBusy: boolean;
  onRemove: () => void;
  status: TransferForm['status'];
}) {
  if (!initial) return null;
  return (
    <div className="space-y-1">
      {!hasChanges && !status && (
        <p className="text-xs font-medium text-muted-foreground">Everything is saved.</p>
      )}
      <Button disabled={isBusy} onClick={onRemove} type="button" variant="ghost">
        <Trash2 /> Remove route
      </Button>
    </div>
  );
}
