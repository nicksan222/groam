import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@groam/ui/components/alert-dialog';
import { createContext, type ReactNode, use, useState } from 'react';
import { testIds } from '@/lib/test-ids';
import type { ConfirmFn } from '@/types/workspace';

export type { ConfirmFn };

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type ConfirmState = {
  description: string;
  title: string;
  resolve: (value: boolean) => void;
};

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const { confirm, dialog } = useConfirmDialog();
  return (
    <ConfirmDialogContext value={confirm}>
      {children}
      {dialog}
    </ConfirmDialogContext>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = use(ConfirmDialogContext);
  return (
    confirm ??
    ((title, description) => Promise.resolve(window.confirm(`${title}\n\n${description}`)))
  );
}

function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm: ConfirmFn = (title, description) =>
    new Promise<boolean>((resolve) => {
      setState({ description, resolve, title });
    });

  const close = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  const dialog = (
    <AlertDialog onOpenChange={(open) => !open && state && close(false)} open={state !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title}</AlertDialogTitle>
          <AlertDialogDescription>{state?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction data-testid={testIds.confirmContinue} onClick={() => close(true)}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
