import {
  MAX_POLL_OPTION_LENGTH,
  MAX_POLL_QUESTION_LENGTH
} from '@groam/backend/convex/modules/polls/lengths';
import { Plus, X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { FormSection } from '@groam/ui/components/form-section';
import { Input } from '@groam/ui/components/input';
import { Switch } from '@groam/ui/components/switch';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useOpenSession } from '@groam/ui/hooks/use-open-session';
import { useRef, useState } from 'react';
import { testIds } from '@/lib/test-ids';
import type { CreatePollDraft } from '@/types/polls';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

const blankRows = () => [
  { id: 0, label: '' },
  { id: 1, label: '' }
];

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type CreatePollDialogProps = {
  onClose: () => void;
  onCreate: (draft: CreatePollDraft) => Promise<unknown>;
  open: boolean;
};

/** Question, 2–10 options, single or multiple choice. Resolves `onCreate` truthy to close. */
export function CreatePollDialog(props: CreatePollDialogProps) {
  const session = useOpenSession(props.open);
  return <CreatePollForm key={session} {...props} />;
}

function CreatePollForm({ onClose, onCreate, open }: CreatePollDialogProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(blankRows);
  // Only read when adding a row, so it never needs to trigger a render.
  const nextId = useRef(2);
  const [multiSelect, setMultiSelect] = useState(false);
  const form = useFormSubmit();
  const filled = options.map((option) => option.label.trim()).filter(Boolean);
  const duplicate = new Set(filled.map((label) => label.toLocaleLowerCase())).size < filled.length;
  const ready = question.trim().length > 0 && filled.length >= MIN_OPTIONS && !duplicate;
  return (
    <FormDialog
      description="Everyone who can vote sees it right away."
      error={form.error}
      isPending={form.isPending}
      onClose={onClose}
      onSubmit={form.handle(async () => {
        if (!ready) return;
        const created = await onCreate({
          multiSelect,
          options: filled,
          question: question.trim()
        });
        if (created) onClose();
      })}
      open={open}
      submitDisabled={!ready}
      submitLabel="Create poll"
      testId={testIds.createPollDialog}
      title="Ask the group"
    >
      <FormField label="Question" maxLength={MAX_POLL_QUESTION_LENGTH} required>
        <Input onChange={(event) => setQuestion(event.target.value)} value={question} />
      </FormField>
      <FormSection error={duplicate ? 'Options must be different.' : null} legend="Options">
        {options.map((option, index) => (
          <div className="flex items-center gap-2" key={option.id}>
            <Input
              aria-label={`Option ${index + 1}`}
              maxLength={MAX_POLL_OPTION_LENGTH}
              onChange={(event) =>
                setOptions(
                  options.map((row) =>
                    row.id === option.id ? { ...row, label: event.target.value } : row
                  )
                )
              }
              value={option.label}
            />
            {options.length > MIN_OPTIONS ? (
              <Button
                aria-label={`Remove option ${index + 1}`}
                onClick={() => setOptions(options.filter((row) => row.id !== option.id))}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden />
              </Button>
            ) : null}
          </div>
        ))}
        <Button
          className="justify-self-start"
          data-testid={testIds.createPollAddOption}
          disabled={options.length >= MAX_OPTIONS}
          onClick={() => {
            setOptions([...options, { id: nextId.current, label: '' }]);
            nextId.current += 1;
          }}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Plus aria-hidden />
          Add option
        </Button>
      </FormSection>
      <FormField label="Allow several choices" layout="inline">
        <Switch checked={multiSelect} onCheckedChange={setMultiSelect} />
      </FormField>
    </FormDialog>
  );
}
