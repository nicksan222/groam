import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useState } from 'react';

/** Sets a flexible trip length, for a trip that has no start date yet. */
export function EditorTripLengthForm({
  initialDays,
  minimumDays,
  onSave
}: {
  initialDays: number;
  minimumDays: number;
  onSave: (days: number) => Promise<unknown>;
}) {
  const [length, setLength] = useState(String(initialDays));
  const submit = useFormSubmit();
  return (
    <Form
      actions={
        <FormActions
          isPending={submit.isPending}
          submitDisabled={
            !Number.isInteger(Number(length)) ||
            Number(length) < minimumDays ||
            Number(length) > 365
          }
          submitLabel="Save trip length"
        />
      }
      className="rounded-xl border border-border p-4"
      error={submit.error}
      isPending={submit.isPending}
      onSubmit={submit.handle(async () => {
        await onSave(Number(length));
      })}
    >
      <FormField
        label="Trip length in days"
        description="Keep the dates flexible. You can choose them later."
      >
        <Input
          type="number"
          min={minimumDays}
          max={365}
          value={length}
          onChange={(event) => setLength(event.target.value)}
          disabled={submit.isPending}
        />
      </FormField>
    </Form>
  );
}
