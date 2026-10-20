import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { RichTextEditor } from '@groam/ui/components/rich-text-editor';
import { type FormEvent, useState } from 'react';
import { testIds } from '@/lib/test-ids';

const researchSubjectMax = 120;
const researchBriefMax = 2000;

export function CreateResearchDialog({
  error,
  isPending = false,
  onClose,
  onSubmit,
  open
}: {
  error?: null | string;
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (input: { brief?: string; subject: string }) => void;
  open: boolean;
}) {
  const [subject, setSubject] = useState('');
  const [brief, setBrief] = useState('');
  const trimmedSubject = subject.trim();
  const trimmedBrief = brief.trim();
  const valid =
    trimmedSubject.length >= 1 &&
    trimmedSubject.length <= researchSubjectMax &&
    brief.length <= researchBriefMax;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid || isPending) return;
    onSubmit({ brief: trimmedBrief || undefined, subject: trimmedSubject });
  };

  return (
    <FormDialog
      contentClassName="sm:max-w-md"
      description="Choose a topic and add a brief. The researcher can investigate it and collect sources for your trip."
      error={error}
      isPending={isPending}
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
          maxLength={researchSubjectMax}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Hotels near the Duomo"
          value={subject}
        />
      </FormField>
      <FormField description="Optional. What are you trying to decide?" label="Brief">
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
