import { Button } from '@groam/ui/components/button';
import { Input } from '@groam/ui/components/input';
import { useId, useState } from 'react';
import { researchSourceUrl } from './research-sources-utils';

export function ResearchSourceForm({
  disabled,
  onAdd
}: {
  disabled: boolean;
  onAdd: (input: { text: string }) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const busy = pending || disabled;
  const add = async () => {
    if (busy) return;
    const url = researchSourceUrl(draft);
    if (!url) {
      setInvalid(true);
      return;
    }
    setPending(true);
    try {
      if (await onAdd({ text: url.href })) setDraft('');
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="space-y-2"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void add();
      }}
    >
      <label className="text-sm font-medium" htmlFor={inputId}>
        Source URL
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          aria-describedby={invalid ? errorId : undefined}
          aria-invalid={invalid || undefined}
          autoComplete="url"
          className="min-w-0 flex-1"
          disabled={busy}
          id={inputId}
          onChange={(event) => {
            setDraft(event.target.value);
            setInvalid(false);
          }}
          placeholder="Paste a link to keep with this research"
          type="url"
          value={draft}
        />
        <Button disabled={!draft.trim() || busy} type="submit" variant="outline">
          {pending ? 'Adding…' : 'Add source'}
        </Button>
      </div>
      {invalid ? (
        <p className="text-sm text-destructive" id={errorId} role="alert">
          Enter a full URL starting with https:// or http://.
        </p>
      ) : null}
    </form>
  );
}
