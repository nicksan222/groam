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
import { Spinner } from '@groam/ui/components/spinner';
import { GitMerge } from 'lucide-react';
import { ideaApplyConfirmAction, ideaApplyConfirmTitle } from '@/features/ideas/idea-glossary';
import { testIds } from '@/lib/test-ids';

export function ApplyIdeaDialog({
  onApply,
  onOpenChange,
  open,
  pending
}: {
  onApply: () => Promise<boolean>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pending: boolean;
}) {
  return (
    <AlertDialog onOpenChange={(next) => !pending && onOpenChange(next)} open={open}>
      <AlertDialogContent aria-busy={pending}>
        <AlertDialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-xl border border-primary/25 text-primary">
            <GitMerge className="size-5" />
          </div>
          <AlertDialogTitle>{ideaApplyConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            This applies the reviewed changes to the shared trip. Everyone will see the updated
            trip, and this idea will be marked as applied.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep reviewing</AlertDialogCancel>
          <AlertDialogAction
            data-testid={testIds.applyIdeaConfirm}
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              void onApply().then((applied) => applied && onOpenChange(false));
            }}
          >
            {pending ? <Spinner /> : <GitMerge />}
            {pending ? 'Applying…' : ideaApplyConfirmAction}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
