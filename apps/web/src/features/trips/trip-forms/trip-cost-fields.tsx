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
        <Select
          disabled={disabled}
          onValueChange={(value) => {
            const next = tripCostSplit(value);
            onSplitChange(next);
          }}
          value={split}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIP_COST_SPLITS.map((value) => (
              <SelectItem key={value} value={value}>
                {tripCostSplitLabels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );
}
