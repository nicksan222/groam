import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { Route } from 'lucide-react';
import { testIds } from '@/lib/test-ids';

export function TransferActions({
  canSave,
  isBusy,
  isPending,
  onCancel,
  onSave
}: {
  canSave: boolean;
  isBusy: boolean;
  isPending: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="ml-auto flex gap-2">
      <Button disabled={isBusy} onClick={onCancel} type="button" variant="outline">
        Cancel
      </Button>
      <Button data-testid={testIds.travelSave} disabled={!canSave} onClick={onSave} type="button">
        {isPending ? <Spinner /> : <Route />} Save travel
      </Button>
    </div>
  );
}
