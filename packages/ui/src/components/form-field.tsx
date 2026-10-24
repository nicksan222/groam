import { FormFeedback } from '@groam/ui/components/form-feedback';
import { Label } from '@groam/ui/components/label';
import { OptionalMark } from '@groam/ui/components/optional-mark';
import { cloneElement, type ReactElement, type ReactNode, use, useId } from 'react';
import { FormLayoutContext } from '#src/components/form-context';
import { cn } from '#src/lib/utils';

/** Props FormField hands its control: label target, length cap, and required/invalid state. */
// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type FieldControlProps = {
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  id?: string;
  maxLength?: number;
  value?: unknown;
};

/**
 * Accessible label + control wrapper. `children` must be a single element that accepts an `id`
 * prop (Input, Textarea, RichTextEditor, Select, Switch…); the generated id wires the label's
 * `htmlFor`, and `maxLength` is passed through to the control.
 */
export type FormFieldProps = {
  children: ReactElement<FieldControlProps>;
  className?: string;
  description?: ReactNode;
  error?: null | string;
  label: string;
  /**
   * `stack` puts the label above the control; `split` puts it in a left column from `lg` up;
   * `inline` puts a switch or checkbox before its label. Defaults to the enclosing Form's layout.
   */
  layout?: 'inline' | 'split' | 'stack';
  /** Length of a value FormField cannot read from the control's string `value`. */
  length?: number;
  /** Most characters the control accepts; passed to the control, with a counter near the end. */
  maxLength?: number;
  /** Marks the field "Optional"; required fields carry no mark, so most forms show none. */
  optional?: boolean;
  /** Announces the field as required to assistive tech. */
  required?: boolean;
};

/** Counters stay out of the way until the value nears its limit. */
const COUNTER_FROM = 0.8;

function FieldMeta({
  description,
  error,
  length,
  maxLength
}: Pick<FormFieldProps, 'description' | 'error' | 'length' | 'maxLength'>) {
  const counter =
    length !== undefined && maxLength !== undefined && length >= maxLength * COUNTER_FROM;
  return (
    <>
      {description || counter ? (
        <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
          {description ? <p className="min-w-0">{description}</p> : <span />}
          {counter ? (
            <span aria-live="polite" className="shrink-0 tabular-nums">
              {length}/{maxLength}
            </span>
          ) : null}
        </div>
      ) : null}
      <FormFeedback error={error} />
    </>
  );
}

/** The one labeled form field: label, control, helper text, counter, and validation error. */
function FormField({
  children,
  className,
  description,
  error,
  label,
  layout,
  length,
  maxLength,
  optional = false,
  required = false
}: FormFieldProps) {
  const id = useId();
  const form = use(FormLayoutContext);
  const resolvedLayout = layout ?? form.fieldLayout;
  const value = children.props.value;
  const control = cloneElement(children, {
    id,
    ...(maxLength === undefined ? {} : { maxLength }),
    ...(required ? { 'aria-required': true } : {}),
    ...(error ? { 'aria-invalid': true } : {})
  });
  const meta = (
    <FieldMeta
      description={description}
      error={error}
      length={length ?? (typeof value === 'string' ? value.length : undefined)}
      maxLength={maxLength}
    />
  );
  const fieldLabel = (
    <div
      className={cn('flex items-baseline gap-2', resolvedLayout === 'split' && 'lg:pt-2 lg:pr-6')}
      data-slot="form-field-label"
    >
      <Label className="leading-5" htmlFor={id}>
        {label}
        {optional ? <span className="sr-only"> (optional)</span> : null}
      </Label>
      {optional ? <OptionalMark /> : null}
    </div>
  );
  const rootClassName = className;

  if (resolvedLayout === 'inline') {
    return (
      <div className={cn('flex items-start gap-3', rootClassName)} data-slot="form-field">
        {control}
        <div className="grid min-w-0 gap-1">
          {fieldLabel}
          {meta}
        </div>
      </div>
    );
  }

  if (resolvedLayout === 'split') {
    return (
      <div
        className={cn('grid gap-2 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-x-0', rootClassName)}
        data-slot="form-field"
      >
        {fieldLabel}
        <div className="grid min-w-0 content-start gap-2 lg:pl-6">
          {control}
          {meta}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('grid content-start gap-2', rootClassName)} data-slot="form-field">
      {fieldLabel}
      {control}
      {meta}
    </div>
  );
}

export { FormField };
