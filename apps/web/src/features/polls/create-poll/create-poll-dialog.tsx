import { Plus, X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { Input } from '@groam/ui/components/input';
import { Label } from '@groam/ui/components/label';
import { Switch } from '@groam/ui/components/switch';
import { useRef, useState } from 'react';
import { testIds } from '@/lib/test-ids';
import type { CreatePollDraft } from '@/types/polls';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

const blankRows = () => [
  { id: 0, label: '' },
  { id: 1, label: '' }
];

/** Question, 2–10 options, single or multiple choice. Resolves `onCreate` truthy to close. */
export function CreatePollDialog({
  onClose,
  onCreate,
  open
}: {
  onClose: () => void;
  onCreate: (draft: CreatePollDraft) => Promise<unknown>;
  open: boolean;
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(blankRows);
  // Only read when adding a row, so it never needs to trigger a render.
  const nextId = useRef(2);
  const [multiSelect, setMultiSelect] = useState(false);
  const [pending, setPending] = useState(false);
  const filled = options.map((option) => option.label.trim()).filter(Boolean);
  const duplicate = new Set(filled.map((label) => label.toLocaleLowerCase())).size < filled.length;
  const ready = question.trim().length > 0 && filled.length >= MIN_OPTIONS && !duplicate;
  const reset = () => {
    setQuestion('');
    setOptions(blankRows());
    setMultiSelect(false);
  };
  return (
    <FormDialog
      description="Everyone who can vote sees it right away."
      isPending={pending}
      onClose={onClose}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!ready) return;
        setPending(true);
        try {
          const created = await onCreate({
            multiSelect,
            options: filled,
            question: question.trim()
          });
          if (created) {
            reset();
            onClose();
          }
        } finally {
          setPending(false);
        }
      }}
      open={open}
      submitDisabled={!ready}
      submitLabel="Create poll"
      testId={testIds.createPollDialog}
      title="Ask the group"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="poll-question">Question</Label>
        <Input
          id="poll-question"
          maxLength={200}
          onChange={(event) => setQuestion(event.target.value)}
          value={question}
        />
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium">Options</legend>
        {options.map((option, index) => (
          <div className="flex items-center gap-1.5" key={option.id}>
            <Input
              aria-label={`Option ${index + 1}`}
              maxLength={80}
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
        {duplicate ? (
          <p className="text-xs text-destructive" role="alert">
            Options must be different.
          </p>
        ) : null}
        <Button
          className="self-start"
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
      </fieldset>
      <div className="flex items-center gap-2">
        <Switch checked={multiSelect} id="poll-multi" onCheckedChange={setMultiSelect} />
        <Label htmlFor="poll-multi">Allow several choices</Label>
      </div>
    </FormDialog>
  );
}
