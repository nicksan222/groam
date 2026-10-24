import type { Id } from '@groam/backend/data-model';
import { FormField } from '@groam/ui/components/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type TripSelectProps = {
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  disabled?: boolean;
  id?: string;
  loading?: boolean;
  onChange: (tripId: Id<'trips'>) => void;
  testId?: string;
  trips?: Array<{ id: Id<'trips'>; name: string }>;
  value: Id<'trips'> | '' | undefined;
};

function TripSelect({
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  disabled,
  id,
  loading,
  onChange,
  testId,
  trips,
  value
}: TripSelectProps) {
  return (
    <Select
      aria-invalid={ariaInvalid}
      aria-required={ariaRequired}
      disabled={loading || disabled || !trips?.length}
      onValueChange={(next) => onChange(next as Id<'trips'>)}
      value={value || undefined}
    >
      <SelectTrigger className="w-full" data-testid={testId} id={id}>
        <SelectValue placeholder={loading ? 'Loading trips…' : 'Choose a trip'} />
      </SelectTrigger>
      <SelectContent>
        {(trips ?? []).map((trip) => (
          <SelectItem key={trip.id} value={trip.id}>
            {trip.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * The required "Trip" picker for create dialogs opened outside a trip. Pair it with
 * TripRequiredDialog for the no-trips case, which this field does not handle.
 */
export function TripSelectField(props: TripSelectProps) {
  return (
    <FormField label="Trip" required>
      <TripSelect {...props} />
    </FormField>
  );
}
