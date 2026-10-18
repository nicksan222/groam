import { Button } from '@groam/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { Trash2 } from 'lucide-react';
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
  const save = async () => {
    if (await editor.save()) onClose();
  };
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
        <div className="max-w-sm space-y-2">
          <label className="text-sm font-medium" htmlFor={`stay-destination-${day}`}>
            Destination for this stay
          </label>
          <Select
            disabled={editor.isPending}
            onValueChange={(id) => {
              const next = destinations.find((stop) => stop.id === id);
              if (next) onChooseDestination(next.id);
            }}
            value={destination.id}
          >
            <SelectTrigger aria-label="Destination" id={`stay-destination-${day}`}>
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
        </div>
      ) : null}
      <StayForm
        currency={props.trip.currency}
        destination={destination}
        draft={editor.draft}
        fileInputRef={editor.fileInputRef}
        isPending={editor.isPending}
        isUploading={editor.isUploading}
        onCancel={onClose}
        onChange={editor.patch}
        onSave={() => void save()}
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
