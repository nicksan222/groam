import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { Textarea } from '@groam/ui/components/textarea';
import { useId, useRef, useState } from 'react';

export function ChangeCommentComposer({
  label,
  onCancel,
  onComment
}: {
  label: string;
  onCancel: () => void;
  onComment: (content: string) => Promise<boolean>;
}) {
  const id = useId();
  const submitting = useRef(false);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const submit = async () => {
    if (!draft.trim() || submitting.current) return;
    submitting.current = true;
    setPending(true);
    setFailed(false);
    try {
      if (await onComment(draft.trim())) onCancel();
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  return (
    <form
      aria-busy={pending}
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label className="block text-xs font-medium" htmlFor={id}>
        Comment on {label}
      </label>
      <Textarea
        disabled={pending}
        id={id}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Ask a question or share a thought…"
        rows={3}
        value={draft}
      />
      {failed && (
        <p role="alert" className="text-xs text-destructive">
          Your comment wasn’t saved. Try again.
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Comments don’t block approval.</p>
        <div className="flex shrink-0 gap-2">
          <Button disabled={pending} onClick={onCancel} size="sm" type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={pending || !draft.trim()} size="sm" type="submit">
            {pending && <Spinner aria-hidden />}
            {pending ? 'Posting…' : 'Add comment'}
          </Button>
        </div>
      </div>
    </form>
  );
}
