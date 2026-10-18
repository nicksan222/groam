import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import {
  TRIP_CURRENCIES,
  type TripCurrency,
  tripCurrency,
  tripCurrencyLabel
} from '@/features/trips/trip-forms/trip-currencies';

export function TripCurrencySelect({
  disabled,
  id,
  onChange,
  value
}: {
  disabled?: boolean;
  id?: string;
  onChange: (currency: TripCurrency) => void;
  value: TripCurrency;
}) {
  return (
    <Select
      disabled={disabled}
      onValueChange={(next) => {
        const currency = tripCurrency(next);
        if (currency) onChange(currency);
      }}
      value={value}
    >
      <SelectTrigger className="w-full" id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TRIP_CURRENCIES.map((code) => (
          <SelectItem key={code} value={code}>
            {tripCurrencyLabel(code)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
