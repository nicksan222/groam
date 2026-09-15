import { cn } from '#src/lib/utils';

export type FormFeedbackProps = {
  className?: string;
  error?: null | string;
  message?: null | string;
};

function FormFeedback({ className, error, message }: FormFeedbackProps) {
  if (error) {
    return (
      <p className={cn('text-sm text-destructive', className)} role="alert">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p className={cn('text-sm text-emerald-600', className)} role="status">
        {message}
      </p>
    );
  }
  return null;
}

export { FormFeedback };
