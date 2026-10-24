import {
  MAX_DISCUSSION_MESSAGE_LENGTH,
  MAX_RESEARCH_TITLE_LENGTH,
  MAX_RESEARCH_TOPIC_LENGTH
} from '@groam/backend/convex/modules/discussions/threads/lengths';
import { Plus, Search, Send } from '@groam/icons';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { Textarea } from '@groam/ui/components/textarea';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useState } from 'react';
import type { ResearchEffort } from '@/types/research';
import { ResearchComposerMode } from './research-composer-mode';

const efforts = {
  quick: { label: 'Quick', description: 'A focused answer with a few targeted searches.' },
  standard: { label: 'Standard', description: 'Compare options and check the important details.' },
  deep: { label: 'Deep', description: 'Investigate more angles, sources, and open questions.' }
} satisfies Record<ResearchEffort, { label: string; description: string }>;

/** A follow-up is sent as `${topic}: ${text}`, so it leaves room for the longest topic. */
const MAX_FOLLOW_UP_LENGTH = MAX_RESEARCH_TOPIC_LENGTH - MAX_RESEARCH_TITLE_LENGTH - 2;

function composerCopy({
  asking,
  busy,
  hasRun
}: {
  asking: boolean;
  busy: boolean;
  hasRun: boolean;
}) {
  if (!asking)
    return {
      Icon: Plus,
      input: 'Research note',
      placeholder: 'Add a finding, question, or link for the group…',
      submit: 'Add note'
    };
  const idle = hasRun ? 'Ask' : 'Research this topic';
  return {
    Icon: hasRun ? Send : Search,
    input: 'Follow-up for the researcher',
    placeholder: hasRun
      ? 'What should the researcher dig into next?'
      : 'Anything the researcher should focus on…',
    submit: busy ? 'Research in progress…' : idle
  };
}

/** One place to contribute: a note for the group, or a follow-up run for the researcher. */
export function ResearchComposer({
  busy,
  hasRun,
  noteDisabled,
  onAsk,
  onSaveNote,
  topic
}: {
  busy: boolean;
  hasRun: boolean;
  noteDisabled: boolean;
  onAsk: (input: { effort: ResearchEffort; topic: string }) => Promise<boolean>;
  onSaveNote: (input: { text: string }) => Promise<boolean>;
  topic: string;
}) {
  const [mode, setMode] = useState<'ask' | 'note'>(hasRun ? 'note' : 'ask');
  const [draft, setDraft] = useState('');
  const [effort, setEffort] = useState<ResearchEffort>('standard');
  const form = useFormSubmit();
  const pending = form.isPending;
  const text = draft.trim();
  const asking = mode === 'ask';
  const copy = composerCopy({ asking, busy, hasRun });
  const disabled = pending || (asking ? busy || (hasRun && !text) : noteDisabled || !text);
  const submit = form.handle(async () => {
    if (disabled) return;
    const saved = asking
      ? await onAsk({
          effort,
          topic: text ? `${topic}: ${text}`.slice(0, MAX_RESEARCH_TOPIC_LENGTH) : topic
        })
      : await onSaveNote({ text });
    if (saved) setDraft('');
  });
  return (
    <Form
      actions={
        <FormActions
          hint={asking ? efforts[effort].description : 'Visible to everyone on the trip.'}
          isPending={pending}
          leading={
            asking ? (
              <Select onValueChange={(value) => setEffort(value as ResearchEffort)} value={effort}>
                <SelectTrigger aria-label="Research effort" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(efforts) as ResearchEffort[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {efforts[value].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : undefined
          }
          size="sm"
          submitDisabled={disabled}
          submitIcon={<copy.Icon aria-hidden />}
          submitLabel={copy.submit}
        />
      }
      className="gap-2 rounded-lg border border-input bg-background p-3 focus-within:border-ring"
      error={form.error}
      isPending={pending}
      onSubmit={submit}
    >
      <ResearchComposerMode mode={mode} onChange={setMode} />
      <Textarea
        aria-label={copy.input}
        className="min-h-20 border-0 px-1 shadow-none focus-visible:ring-0"
        disabled={pending}
        maxLength={asking ? MAX_FOLLOW_UP_LENGTH : MAX_DISCUSSION_MESSAGE_LENGTH}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={copy.placeholder}
        value={draft}
      />
    </Form>
  );
}
