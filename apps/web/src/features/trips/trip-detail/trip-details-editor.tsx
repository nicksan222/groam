import { Button } from '@groam/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { Spinner } from '@groam/ui/components/spinner';
import { type FormEvent, useState } from 'react';
import { ideaEditDetails } from '@/features/ideas/idea-glossary';
import type { TripDetail, TripUpdateInput } from '@/features/trips/hooks/use-trips';
import { tripDurationInput } from '@/features/trips/trip-duration-input';
import type { TripCurrency } from '@/features/trips/trip-forms/trip-currencies';
import { TripCurrencySelect } from '@/features/trips/trip-forms/trip-currency-select';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { testIds } from '@/lib/test-ids';

function valueOrUndefined(value: string): number | undefined {
  return value.trim() ? Number(value) : undefined;
}

export function TripDetailsEditor({
  onClose,
  trip,
  update
}: {
  onClose: () => void;
  trip: TripDetail;
  update: (input: TripUpdateInput) => Promise<boolean>;
}) {
  const [name, setName] = useState(trip.name);
  const [dateNotes, setDateNotes] = useState(trip.dateNotes ?? '');
  const [totalDuration, setTotalDuration] = useState(
    () => trip.totalDurationDays?.toString() ?? ''
  );
  const [currency, setCurrency] = useState<TripCurrency>(trip.currency);
  const [budget, setBudget] = useState(() => trip.initialBudget?.toString() ?? '');
  const submitting = useAsyncPending();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const budgetAmount = valueOrUndefined(budget);
    const totalDays = valueOrUndefined(totalDuration);
    const duration = tripDurationInput(trip, totalDays);
    await submitting.run(async () => {
      const updated = await update({
        ...(budgetAmount === undefined ? {} : { budget: { amount: budgetAmount } }),
        currency,
        dateNotes: dateNotes.trim() || undefined,
        destination: trip.destination,
        ...(duration ? { duration } : {}),
        name,
        ...(trip.startDate ? { startDate: trip.startDate } : {})
      });
      if (updated) onClose();
    });
  };

  return (
    <Dialog onOpenChange={(open) => !open && !submitting.isPending && onClose()} open>
      <DialogContent className="sm:max-w-2xl" data-testid={testIds.editTripDialog}>
        <DialogHeader>
          <DialogTitle>{ideaEditDetails}</DialogTitle>
          <DialogDescription>
            Unknown dates and durations can stay empty. Changes are recorded in activity.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid items-start gap-4 sm:grid-cols-2"
          onSubmit={(event) => void submit(event)}
        >
          <FormField className="sm:col-span-2" label="Trip name">
            <Input
              autoFocus
              data-testid={testIds.createTripName}
              disabled={submitting.isPending}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </FormField>
          <FormField className="sm:col-span-2" label="Approximate period or date notes">
            <Input
              data-testid={testIds.editTripDateNotes}
              disabled={submitting.isPending}
              maxLength={240}
              onChange={(event) => setDateNotes(event.target.value)}
              value={dateNotes}
            />
          </FormField>
          <FormField className="sm:col-span-2" label="Total trip length (days)">
            <Input
              data-testid={testIds.createTripDuration}
              disabled={submitting.isPending}
              max={365}
              min={1}
              onChange={(event) => setTotalDuration(event.target.value)}
              type="number"
              value={totalDuration}
            />
          </FormField>
          <FormField label="Default currency">
            <TripCurrencySelect
              disabled={submitting.isPending}
              onChange={setCurrency}
              value={currency}
            />
          </FormField>
          <FormField
            description="The whole group's budget for this trip — not a per-person amount."
            label="Total group budget"
          >
            <Input
              data-testid={testIds.editTripBudget}
              disabled={submitting.isPending}
              min={1}
              onChange={(event) => setBudget(event.target.value)}
              step="0.01"
              type="number"
              value={budget}
            />
          </FormField>
          <DialogFooter className="sm:col-span-2">
            <Button
              disabled={submitting.isPending}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              data-testid={testIds.editTripSave}
              disabled={submitting.isPending || !name.trim()}
              type="submit"
            >
              {submitting.isPending && <Spinner />} Save details
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
