import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import {
  TRIP_COST_SPLITS,
  type TripCostSplit,
  tripCostAmountLabel,
  tripCostSplit,
  tripCostSplitLabels
} from '@/features/trips/trip-forms/trip-cost';

/** Select that takes the `id` FormField generates, so the label targets the trigger. */
function TripCostSplitSelect({
  disabled,
  id,
  onChange,
  value
}: {
  disabled?: boolean;
  id?: string;
  onChange: (split: TripCostSplit) => void;
  value: TripCostSplit;
}) {
  return (
    <Select
      disabled={disabled}
      onValueChange={(next) => onChange(tripCostSplit(next))}
      value={value}
    >
      <SelectTrigger className="w-full" id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TRIP_COST_SPLITS.map((split) => (
          <SelectItem key={split} value={split}>
            {tripCostSplitLabels[split]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TripCostFields({
  amount,
  currency,
  disabled,
  error,
  label,
  onAmountChange,
  onSplitChange,
  split
}: {
  amount: string;
  currency?: string;
  disabled?: boolean;
  error?: string;
  label: string;
  onAmountChange: (amount: string) => void;
  onSplitChange: (split: TripCostSplit) => void;
  split: TripCostSplit;
}) {
  return (
    <div className="grid items-start gap-4 sm:grid-cols-2">
      <FormField error={error} label={tripCostAmountLabel(label, split, currency)}>
        <Input
          disabled={disabled}
          min={0}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder="0.00"
          step="0.01"
          type="number"
          value={amount}
        />
      </FormField>
      <FormField
        description="The trip budget is the group's total. Per-person amounts are multiplied by travelers marked Going."
        label="This cost is"
      >
        <TripCostSplitSelect disabled={disabled} onChange={onSplitChange} value={split} />
      </FormField>
    </div>
  );
}
