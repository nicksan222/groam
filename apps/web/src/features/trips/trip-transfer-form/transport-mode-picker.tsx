import { FormSection } from '@groam/ui/components/form-section';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
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
  return (
    <FormSection
      description="Choose the main way you’ll make this connection."
      legend="How are we traveling?"
    >
      <div className="max-w-sm">
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
            aria-label="Transport mode"
            data-testid={testIds.travelMode}
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
    </FormSection>
  );
}
