import { MAX_PROPOSAL_CLOSE_REASON_LENGTH } from '@groam/backend/convex/modules/travel/versions/lengths';
import { Button } from '@groam/ui/components/button';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { RichTextEditor } from '@groam/ui/components/rich-text-editor';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useOpenSession } from '@groam/ui/hooks/use-open-session';
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
  onClose,
  onConfirm,
  pending,
  title
}: {
  confirmLabel: string;
  description: string;
  isOpen: boolean;
  needsReason: boolean;
  onClose: () => void;
  onConfirm: (reason: string | undefined) => Promise<boolean>;
  pending: boolean;
  title: string;
}) {
  const [reason, setReason] = useState('');
  const form = useFormSubmit();
  const submit = form.handle(async () => {
    const trimmed = reason.trim();
    if (needsReason && trimmed.length === 0) return;
    await onConfirm(trimmed || undefined);
  });

  return (
    <FormDialog
      description={description}
      error={form.error}
      isPending={form.isPending || pending}
      onClose={onClose}
      onSubmit={submit}
      open={isOpen}
      submitDisabled={needsReason && !reason.trim()}
      submitLabel={confirmLabel}
      submitVariant={needsReason ? 'default' : 'destructive'}
      title={title}
    >
      <FormField
        label={needsReason ? 'Why are you closing this idea?' : 'Note'}
        maxLength={MAX_PROPOSAL_CLOSE_REASON_LENGTH}
        optional={!needsReason}
        required={needsReason}
      >
        <RichTextEditor
          aria-label={needsReason ? 'Why are you closing this idea?' : 'Note'}
          onChange={setReason}
          placeholder="e.g. We’re keeping the shared trip dates"
          testId={testIds.closeIdeaReason}
          value={reason}
        />
      </FormField>
    </FormDialog>
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
  const session = useOpenSession(isOpen);
  const needsReason = proposal.status !== 'draft';
  const copy = passOnIdeaCopy(proposal.status);

  const confirm = async (reason: string | undefined) => {
    const ok = await run('close', () => close(reason));
    if (ok) {
      setOpen(false);
      onClosed?.();
    }
    return ok;
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
        key={session}
        confirmLabel={copy.confirm}
        description={copy.description}
        isOpen={isOpen}
        needsReason={needsReason}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        pending={pendingAction === 'close'}
        title={copy.title}
      />
    </>
  );
}
