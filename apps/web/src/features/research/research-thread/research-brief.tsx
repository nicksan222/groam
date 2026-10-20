import { Pencil } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Markdown } from '@groam/ui/components/markdown';
import { Textarea } from '@groam/ui/components/textarea';
import { useState } from 'react';

export function ResearchBrief({
  brief,
  canEdit,
  onSave
}: {
  brief: null | string;
  canEdit: boolean;
  onSave: (brief: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(brief ?? '');
  const [pending, setPending] = useState(false);

  const save = async () => {
    if (pending || !canEdit) return;
    setPending(true);
    try {
      if (await onSave(draft.trim())) setEditing(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-labelledby="research-brief-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold" id="research-brief-heading">
          Research brief
        </h2>
        {canEdit && !editing ? (
          <Button
            onClick={() => {
              setDraft(brief ?? '');
              setEditing(true);
            }}
            size="sm"
            variant="ghost"
          >
            <Pencil aria-hidden className="size-3.5" />
            Edit
          </Button>
        ) : null}
      </div>
      {editing && canEdit ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <Textarea
            aria-label="Research brief"
            className="min-h-48 leading-relaxed"
            disabled={pending}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What are you trying to decide? Add your questions and constraints."
            value={draft}
          />
          <div className="flex items-center gap-2">
            <Button disabled={pending} size="sm" type="submit">
              {pending ? 'Saving…' : 'Save brief'}
            </Button>
            <Button disabled={pending} onClick={() => setEditing(false)} size="sm" variant="ghost">
              Cancel
            </Button>
          </div>
        </form>
      ) : brief ? (
        <Markdown className="text-base leading-7 text-foreground [&_p]:leading-7">{brief}</Markdown>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Define the question you’re exploring, the options to compare, and what matters for this
          trip.
        </p>
      )}
    </section>
  );
}
