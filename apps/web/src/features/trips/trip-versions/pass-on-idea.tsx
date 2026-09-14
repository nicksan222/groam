import { Button } from '@groam/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { Label } from '@groam/ui/components/label';
import { Spinner } from '@groam/ui/components/spinner';
import { Textarea } from '@groam/ui/components/textarea';
import { useState } from 'react';
import { ideaCloseWithoutApplying, ideaDeleteDraft } from '@/features/ideas/idea-glossary';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { testIds } from '@/lib/test-ids';
import type { ProposalActionRunner, ProposalDetail } from './proposal-types';

function passOnIdeaCopy(status: ProposalDetail['status']) {
  const isDraft = status === 'draft';
  return {
    confirm: isDraft ? ideaDeleteDraft : ideaCloseWithoutApplying,
    description: isDraft
      ? 'This draft will be deleted and will no longer appear as an open idea.'
      : 'Tell the group why this idea is not being applied to the shared trip.',
    title: isDraft ? 'Delete this draft?' : 'Close without applying?',
    trigger: isDraft ? ideaDeleteDraft : ideaCloseWithoutApplying
  };
}

function PassOnTrigger({
  appearance,
  disabled,
  hidden,
  label,
  needsReason,
  onOpen,
  testId
}: {
  appearance: 'header' | 'quiet';
  disabled: boolean;
  hidden: boolean;
  label: string;
  needsReason: boolean;
  onOpen: () => void;
  testId: string;
}) {
  if (hidden) return null;
  return (
    <Button
      className={
        appearance === 'quiet'
          ? 'h-auto px-1 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-destructive'
          : undefined
      }
      data-testid={testId}
      disabled={disabled}
      onClick={onOpen}
      size={appearance === 'header' ? 'sm' : 'default'}
      variant={appearance === 'header' ? (needsReason ? 'outline' : 'destructive') : 'ghost'}
    >
      {label}
    </Button>
  );
}

function PassOnDialog({
  confirmLabel,
  description,
  isOpen,
  needsReason,
  onOpenChange,
  onSubmit,
  pending,
  reason,
  setReason,
  title
}: {
  confirmLabel: string;
  description: string;
  isOpen: boolean;
  needsReason: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  pending: boolean;
  reason: string;
  setReason: (reason: string) => void;
  title: string;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor={testIds.closeIdeaReason}>
            {needsReason ? 'Why are you closing this idea?' : 'Note (optional)'}
          </Label>
          <Textarea
            aria-required={needsReason}
            data-testid={testIds.closeIdeaReason}
            id={testIds.closeIdeaReason}
            maxLength={280}
            onChange={(event) => setReason(event.target.value)}
            placeholder="We’re keeping the shared trip dates."
            rows={3}
            value={reason}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={pending || (needsReason && !reason.trim())}
            onClick={onSubmit}
            variant={needsReason ? 'default' : 'destructive'}
          >
            {pending ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PassOnIdea({
  appearance = 'quiet',
  close,
  hideTrigger = false,
  onClosed,
  onOpenChange,
  open,
  pendingAction,
  proposal,
  run,
  triggerTestId = testIds.closeIdea
}: {
  appearance?: 'header' | 'quiet';
  close: (reason?: string) => Promise<boolean>;
  hideTrigger?: boolean;
  onClosed?: () => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  pendingAction: string | null;
  proposal: ProposalDetail;
  run: ProposalActionRunner;
  triggerTestId?: string;
}) {
  const dialog = useOpenState(false);
  const isOpen = open ?? dialog.open;
  const setOpen = onOpenChange ?? dialog.setOpen;
  const [reason, setReason] = useState('');
  const needsReason = proposal.status !== 'draft';
  const copy = passOnIdeaCopy(proposal.status);

  const submit = async () => {
    const trimmed = reason.trim();
    if (needsReason && trimmed.length === 0) return;
    const ok = await run('close', () => close(trimmed || undefined));
    if (ok) {
      setOpen(false);
      setReason('');
      onClosed?.();
    }
  };

  return (
    <>
      <PassOnTrigger
        appearance={appearance}
        disabled={pendingAction !== null}
        hidden={hideTrigger}
        label={copy.trigger}
        needsReason={needsReason}
        onOpen={() => setOpen(true)}
        testId={triggerTestId}
      />
      <PassOnDialog
        confirmLabel={copy.confirm}
        description={copy.description}
        isOpen={isOpen}
        needsReason={needsReason}
        onOpenChange={setOpen}
        onSubmit={() => void submit()}
        pending={pendingAction === 'close'}
        reason={reason}
        setReason={setReason}
        title={copy.title}
      />
    </>
  );
}
