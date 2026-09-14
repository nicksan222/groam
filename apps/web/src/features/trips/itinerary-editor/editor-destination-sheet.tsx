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
import { useRef } from 'react';
import { TripDestinationStays } from '@/features/trips/trip-destinations/trip-destination-stays/trip-destination-stays';
import type { ItineraryEditorMode, ItineraryEditorProps } from '@/types/itinerary-editor';
import type { Destination } from '@/types/trips';
import { EditorRouteStop } from './editor-route-stop';
import { EditorTravelPanel } from './editor-travel-panel';

export function EditorDestinationSheet({
  props,
  destination,
  section,
  onSelect,
  onClose
}: {
  props: ItineraryEditorProps;
  destination: Destination;
  section: ItineraryEditorMode;
  onSelect: (id: Destination['id']) => void;
  onClose: () => void;
}) {
  const focusSection = useRef<HTMLDivElement>(null);
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focusSection.current?.scrollIntoView({ block: 'start' });
          focusSection.current?.focus({ preventScroll: true });
        }}
      >
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle>{destination.name}</SheetTitle>
          <SheetDescription>Destination details, stays, and travel for this idea.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {props.trip.destinations.length > 1 ? (
            <Select
              value={destination.id}
              onValueChange={(id) => onSelect(id as Destination['id'])}
            >
              <SelectTrigger aria-label="Destination to manage" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {props.trip.destinations.map((stop) => (
                  <SelectItem key={stop.id} value={stop.id}>
                    {stop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <div tabIndex={-1} ref={section === 'route' ? focusSection : undefined}>
            <EditorRouteStop
              key={`${destination.id}:${destination.startDay}:${destination.endDay}:${destination.dayNotes ?? ''}`}
              {...props}
              destination={destination}
            />
          </div>
          <div
            tabIndex={-1}
            ref={section === 'stays' ? focusSection : undefined}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold">Stays</h3>
            <TripDestinationStays
              {...props.stayActions}
              canManage
              currency={props.trip.currency}
              destination={destination}
              tripStartDate={props.trip.startDate}
            />
          </div>
          <div
            tabIndex={-1}
            ref={section === 'travel' ? focusSection : undefined}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold">Travel</h3>
            <EditorTravelPanel
              trip={props.trip}
              destination={destination}
              actions={props.activityActions}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
