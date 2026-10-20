import { Button } from '@groam/ui/components/button';
import { Textarea } from '@groam/ui/components/textarea';
import { useId, useState } from 'react';

export function ResearchNoteForm({
  disabled,
  onSave
}: {
  disabled: boolean;
  onSave: (input: { text: string }) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const id = useId();
  const save = async () => {
    if (disabled || pending || !draft.trim()) return;
    setPending(true);
    try {
      if (await onSave({ text: draft.trim() })) setDraft('');
    } finally {
      setPending(false);
    }
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label className="text-sm font-medium" htmlFor={id}>
        Research note
      </label>
      <Textarea
        disabled={disabled || pending}
        id={id}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Add a finding, question, or useful link for the group"
        rows={4}
        value={draft}
      />
      <Button disabled={disabled || pending || !draft.trim()} type="submit">
        {pending ? 'Saving…' : 'Save note'}
      </Button>
    </form>
  );
}
