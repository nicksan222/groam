import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { Hotel, Plus } from 'lucide-react';
import { useTripStayEditor } from '@/features/trips/hooks/use-trip-stay-editor';
import type { TripStayInput } from '@/features/trips/hooks/use-trips';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import { testIds } from '@/lib/test-ids';
import { HighlightedStayCard } from './highlighted-stay-card';
import { StayForm } from './stay-form';
import type { Stay, TripStayDestination } from './stay-types';

export function TripDestinationStays({
  addStay,
  canManage,
  currency,
  destination,
  removeStay,
  tripStartDate,
  updateStay
}: {
  addStay: (destinationId: Id<'tripDestinations'>, input: TripStayInput) => Promise<boolean>;
  canManage: boolean;
  currency: string;
  destination: TripStayDestination;
  removeStay: (stayId: Id<'tripDestinationStays'>) => Promise<boolean>;
  tripStartDate: null | string;
  updateStay: (stayId: Id<'tripDestinationStays'>, input: TripStayInput) => Promise<boolean>;
}) {
  const {
    close,
    draft,
    editingId,
    fileInputRef,
    isPending,
    isUploading,
    open,
    patch,
    save,
    uploadFiles
  } = useTripStayEditor({ addStay, destination, updateStay });
  const confirm = useConfirm();
  const remove = async (stay: Stay) => {
    if (!(await confirm(`Remove ${stay.title}?`, 'This stay will be deleted from the stop.'))) {
      return;
    }
    await removeStay(stay.id);
  };

  return (
    <Shell.Card as="section" padding="md">
      <div className="flex flex-wrap items-center gap-2">
        <Hotel className="size-3.5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {destination.stays.length === 0
            ? 'No stays yet'
            : `${destination.stays.length} ${destination.stays.length === 1 ? 'stay' : 'stays'}`}
        </p>
        {canManage && editingId === null && (
          <Button
            className="ml-auto"
            data-testid={testIds.addStay}
            onClick={() => open()}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Plus /> Add stay
          </Button>
        )}
      </div>

      {destination.stays.length > 0 && (
        <div className="mt-3 grid gap-2">
          {destination.stays.map((stay) =>
            editingId === stay.id ? (
              <StayForm
                currency={currency}
                destination={destination}
                draft={draft}
                fileInputRef={fileInputRef}
                isPending={isPending}
                isUploading={isUploading}
                key={stay.id}
                onCancel={close}
                onChange={patch}
                onSave={() => void save()}
                onUpload={(files) => void uploadFiles(files)}
                tripStartDate={tripStartDate}
              />
            ) : (
              <HighlightedStayCard
                canManage={canManage}
                currency={currency}
                key={stay.id}
                onEdit={() => open(stay)}
                onRemove={() => void remove(stay)}
                stay={stay}
                tripStartDate={tripStartDate}
              />
            )
          )}
        </div>
      )}

      {editingId === 'new' && (
        <div className="mt-3">
          <StayForm
            currency={currency}
            destination={destination}
            draft={draft}
            fileInputRef={fileInputRef}
            isPending={isPending}
            isUploading={isUploading}
            onCancel={close}
            onChange={patch}
            onSave={() => void save()}
            onUpload={(files) => void uploadFiles(files)}
            tripStartDate={tripStartDate}
          />
        </div>
      )}
    </Shell.Card>
  );
}
