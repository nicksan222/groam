import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { useId } from 'react';
import type { TransportMode } from '@/features/trips/hooks/use-trips';
import { transportModes } from '@/features/trips/trip-transfer-options';
import { testIds } from '@/lib/test-ids';

export function TransportModePicker({
  disabled,
  mode,
  onChange
}: {
  disabled: boolean;
  mode: TransportMode;
  onChange: (mode: TransportMode) => void;
}) {
  const id = useId();
  return (
    <fieldset className="min-w-0 space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">How are we traveling?</legend>
      <p className="text-xs text-muted-foreground">
        Choose the main way you’ll make this connection.
      </p>
      <div className="max-w-sm">
        <label className="sr-only" htmlFor={id}>
          Transport mode
        </label>
        <Select
          disabled={disabled}
          onValueChange={(value) => {
            const selected = transportModes.find((item) => item.mode === value);
            if (selected) onChange(selected.mode);
          }}
          value={mode}
        >
          <SelectTrigger
            className="h-11 w-full rounded-xl border-border bg-background px-3 shadow-xs"
            data-testid={testIds.travelMode}
            id={id}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {transportModes.map(({ icon: Icon, label, mode: value }) => (
              <SelectItem key={value} value={value}>
                <span className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  {label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </fieldset>
  );
}
