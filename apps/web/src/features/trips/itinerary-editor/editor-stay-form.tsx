import { Trash2 } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { FormField } from '@groam/ui/components/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { useEffect, useRef } from 'react';
import { useTripStayEditor } from '@/features/trips/hooks/use-trip-stay-editor';
import { StayForm } from '@/features/trips/trip-destinations/trip-destination-stays/stay-form';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import type { ItineraryEditorProps } from '@/types/itinerary-editor';
import type { Destination } from '@/types/trips';

export function EditorStayForm({
  props,
  destination,
  destinations,
  day,
  stayId,
  onChooseDestination,
  onClose
}: {
  props: ItineraryEditorProps;
  destination: Destination;
  destinations: Destination[];
  day: number;
  stayId?: Destination['stays'][number]['id'];
  onChooseDestination: (id: Destination['id']) => void;
  onClose: () => void;
}) {
  const editor = useTripStayEditor({ ...props.stayActions, destination });
  const initialized = useRef(false);
  const confirm = useConfirm();
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    editor.open(destination.stays.find((stay) => stay.id === stayId));
    if (!stayId)
      editor.patch({
        checkInDay: String(day),
        checkOutDay: String(Math.max(day, destination.endDay ?? day))
      });
  }, [day, destination, editor, stayId]);
  const save = editor.form.handle(async () => {
    if (await editor.submit()) onClose();
  });
  const remove = async () => {
    const stay = destination.stays.find((item) => item.id === stayId);
    if (
      !stay ||
      !(await confirm(`Remove ${stay.title}?`, 'This stay will be deleted from the trip.'))
    )
      return;
    if (await props.stayActions.removeStay(stay.id)) onClose();
  };
  return (
    <section aria-label={stayId ? 'Edit stay' : 'Add stay'} className="space-y-3">
      {!stayId && destinations.length > 1 ? (
        <FormField className="max-w-sm" label="Destination">
          <Select
            disabled={editor.isPending}
            onValueChange={(id) => {
              const next = destinations.find((stop) => stop.id === id);
              if (next) onChooseDestination(next.id);
            }}
            value={destination.id}
          >
            <SelectTrigger aria-label="Destination">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {destinations.map((stop) => (
                <SelectItem key={stop.id} value={stop.id}>
                  {stop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      ) : null}
      <StayForm
        currency={props.trip.currency}
        destination={destination}
        draft={editor.draft}
        fileInputRef={editor.fileInputRef}
        error={editor.form.error}
        isPending={editor.isPending}
        isUploading={editor.isUploading}
        onCancel={onClose}
        onChange={editor.patch}
        onSubmit={save}
        onUpload={(files) => void editor.uploadFiles(files)}
        tripStartDate={props.trip.startDate}
      />
      {stayId ? (
        <Button variant="ghost" size="sm" onClick={() => void remove()}>
          <Trash2 />
          Remove stay
        </Button>
      ) : null}
    </section>
  );
}
