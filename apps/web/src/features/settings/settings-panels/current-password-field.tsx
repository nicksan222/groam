import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';

export function CurrentPasswordField({
  disabled,
  onChange,
  required,
  testId,
  value
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  required?: boolean;
  testId?: string;
  value: string;
}) {
  return (
    <FormField label="Current password" required={required}>
      <Input
        autoComplete="current-password"
        data-testid={testId}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        type="password"
        value={value}
      />
    </FormField>
  );
}
