import { Label } from '@groam/ui/components/label';
import { cloneElement, type ReactElement, useId } from 'react';
import { cn } from '#src/lib/utils';

/**
 * Accessible label + control wrapper. `children` must be a single element that
 * accepts an `id` prop (e.g. Input, Textarea); the generated id wires label `htmlFor`.
 */
export type FormFieldProps = {
  children: ReactElement<{ id?: string }>;
  className?: string;
  description?: string;
  error?: string;
  label: string;
  required?: boolean;
};

/** Standard labeled form field with optional helper text and validation error. */
function FormField({
  children,
  className,
  description,
  error,
  label,
  required = false
}: FormFieldProps) {
  const id = useId();
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {cloneElement(children, { id })}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { FormField };
