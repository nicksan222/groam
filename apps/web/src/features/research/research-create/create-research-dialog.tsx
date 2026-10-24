import {
  MAX_RESEARCH_BRIEF_LENGTH,
  MAX_RESEARCH_TITLE_LENGTH
} from '@groam/backend/convex/modules/discussions/threads/lengths';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { RichTextEditor } from '@groam/ui/components/rich-text-editor';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useOpenSession } from '@groam/ui/hooks/use-open-session';
import { useState } from 'react';
import { testIds } from '@/lib/test-ids';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type CreateResearchDialogProps = {
  error?: null | string;
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (input: { brief?: string; subject: string }) => Promise<void> | void;
  open: boolean;
};

/** Starts a research thread; every opening begins with an empty subject and brief. */
export function CreateResearchDialog(props: CreateResearchDialogProps) {
  const session = useOpenSession(props.open);
  return <CreateResearchForm key={session} {...props} />;
}

function CreateResearchForm({
  error,
  isPending = false,
  onClose,
  onSubmit,
  open
}: CreateResearchDialogProps) {
  const [subject, setSubject] = useState('');
  const [brief, setBrief] = useState('');
  const form = useFormSubmit();
  const trimmedSubject = subject.trim();
  const trimmedBrief = brief.trim();
  const valid =
    trimmedSubject.length >= 1 &&
    trimmedSubject.length <= MAX_RESEARCH_TITLE_LENGTH &&
    brief.length <= MAX_RESEARCH_BRIEF_LENGTH;

  const submit = form.handle(async () => {
    if (!valid || isPending) return;
    await onSubmit({ brief: trimmedBrief || undefined, subject: trimmedSubject });
  });

  return (
    <FormDialog
      contentClassName="sm:max-w-md"
      description="Choose a topic and add a brief. The researcher can investigate it and collect sources for your trip."
      error={error ?? form.error}
      isPending={isPending || form.isPending}
      onClose={onClose}
      onSubmit={submit}
      open={open}
      submitDisabled={!valid}
      submitLabel="Start research"
      testId={testIds.createResearchDialog}
      title="New research"
    >
      <FormField label="Subject" required>
        <Input
          autoComplete="off"
          autoFocus
          data-testid={testIds.createResearchSubject}
          maxLength={MAX_RESEARCH_TITLE_LENGTH}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="e.g. Hotels near the Duomo"
          value={subject}
        />
      </FormField>
      <FormField
        description="What are you trying to decide?"
        label="Brief"
        maxLength={MAX_RESEARCH_BRIEF_LENGTH}
        optional
      >
        <RichTextEditor
          aria-label="Brief"
          contentClassName="min-h-24 max-h-48 overflow-y-auto"
          onChange={setBrief}
          testId={testIds.createResearchBrief}
          value={brief}
        />
      </FormField>
    </FormDialog>
  );
}
