import { MAX_RESEARCH_BRIEF_LENGTH } from '@groam/backend/convex/modules/discussions/threads/lengths';
import { Pencil } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { Heading } from '@groam/ui/components/heading';
import { Markdown } from '@groam/ui/components/markdown';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import { Textarea } from '@groam/ui/components/textarea';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
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
  const form = useFormSubmit();

  const save = form.handle(async () => {
    if (!canEdit) return;
    if (await onSave(draft.trim())) setEditing(false);
  });

  return (
    <section aria-labelledby="research-brief-heading" className="space-y-1">
      <div className="-mt-1 flex items-center justify-between gap-3">
        <div className="text-xs leading-6 text-muted-foreground">
          <Heading
            level={2}
            className="inline font-medium text-foreground"
            id="research-brief-heading"
          >
            Research brief
          </Heading>{' '}
          <span>· the question we are answering</span>
        </div>
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
        <Form
          actions={
            <FormActions
              isPending={form.isPending}
              onCancel={() => setEditing(false)}
              size="sm"
              submitLabel="Save brief"
            />
          }
          error={form.error}
          isPending={form.isPending}
          onSubmit={save}
        >
          <Textarea
            aria-label="Research brief"
            className="min-h-48 leading-relaxed"
            disabled={form.isPending}
            maxLength={MAX_RESEARCH_BRIEF_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What are you trying to decide? Add your questions and constraints."
            value={draft}
          />
        </Form>
      ) : brief ? (
        <Markdown className="text-sm leading-6 text-foreground">{brief}</Markdown>
      ) : (
        <MutedCopy>
          Define the question you’re exploring, the options to compare, and what matters for this
          trip.
        </MutedCopy>
      )}
    </section>
  );
}
