import { Button } from '@groam/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import {
  existingDraftPrompt,
  ideaContinueDraft,
  ideaStartAnother
} from '@/features/ideas/idea-glossary';

export function ContinueDraftDialog({
  onContinue,
  onOpenChange,
  onStartAnother,
  open,
  title
}: {
  onContinue: () => void;
  onOpenChange: (open: boolean) => void;
  onStartAnother: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>You already have a draft</DialogTitle>
          <DialogDescription>{existingDraftPrompt(title)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onStartAnother} variant="outline">
            {ideaStartAnother}
          </Button>
          <Button onClick={onContinue}>{ideaContinueDraft}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
