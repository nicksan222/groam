import { type AsyncAction, useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { type FormEvent, useCallback } from 'react';

export type FormSubmit = AsyncAction & {
  /** Form `onSubmit` handler: stops the browser submit, then `run`s the action. */
  handle: (action: () => Promise<unknown>) => (event?: FormEvent) => void;
};

export type UseFormSubmitOptions = {
  /** Shown when a thrown error carries no readable message. */
  fallbackError?: string;
};

/** The one submit lifecycle every form shares: pending, double-submit guard, and error. */
export function useFormSubmit(options: UseFormSubmitOptions = {}): FormSubmit {
  const action = useAsyncAction(options);
  const { run } = action;

  const handle = useCallback(
    (submit: () => Promise<unknown>) => (event?: FormEvent) => {
      event?.preventDefault();
      void run(submit);
    },
    [run]
  );

  return { ...action, handle };
}
