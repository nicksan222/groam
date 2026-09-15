import { Button } from '@groam/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { FormField } from '@groam/ui/components/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { useState } from 'react';
import type { EditorActivitySelection } from '@/types/itinerary-editor';
import type { PlannerPeriod } from '@/types/trip-planner';
import type { Destination } from '@/types/trips';

function destinationsForDay(destinations: Destination[], day: number) {
  return destinations.filter(
    (destination) =>
      destination.startDay === null ||
      destination.endDay === null ||
      (destination.startDay <= day && destination.endDay >= day)
  );
}

export function EditorAddPlan({
  dayCount,
  destinations,
  onChoose,
  onClose
}: {
  dayCount: number;
  destinations: Destination[];
  onChoose: (selection: EditorActivitySelection) => void;
  onClose: () => void;
}) {
  const [day, setDay] = useState(1);
  const available = destinationsForDay(destinations, day);
  const [destinationId, setDestinationId] = useState(available[0]?.id ?? '');
  const [period, setPeriod] = useState<PlannerPeriod>('morning');
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a plan</DialogTitle>
          <DialogDescription>
            Choose the day, place, and time. You can set exact times next.
          </DialogDescription>
        </DialogHeader>
        {dayCount > 1 ? (
          <FormField label="Day">
            <Select
              value={String(day)}
              onValueChange={(value) => {
                const nextDay = Number(value);
                const nextAvailable = destinationsForDay(destinations, nextDay);
                setDay(nextDay);
                if (!nextAvailable.some((destination) => destination.id === destinationId))
                  setDestinationId(nextAvailable[0]?.id ?? '');
              }}
            >
              <SelectTrigger aria-label="Day" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: dayCount }, (_, index) => index + 1).map((number) => (
                  <SelectItem key={number} value={String(number)}>
                    Day {number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        ) : null}
        <FormField label="Destination">
          <Select
            value={destinationId}
            onValueChange={(value) => setDestinationId(value as Destination['id'])}
          >
            <SelectTrigger aria-label="Destination" className="w-full">
              <SelectValue placeholder="Choose a destination" />
            </SelectTrigger>
            <SelectContent>
              {available.map((stop) => (
                <SelectItem key={stop.id} value={stop.id}>
                  {stop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Part of the day">
          <Select value={period} onValueChange={(value) => setPeriod(value as PlannerPeriod)}>
            <SelectTrigger aria-label="Part of the day" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="afternoon">Afternoon</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
              <SelectItem value="full_day">Flexible / all day</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        {!available.length ? (
          <p className="text-sm text-muted-foreground">
            Open a destination’s details from Your route to assign it to this day.
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!destinationId}
            onClick={() =>
              onChoose({ destinationId: destinationId as Destination['id'], day, period })
            }
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
