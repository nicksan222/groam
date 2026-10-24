import {
  MAX_ISSUE_BODY_LENGTH,
  MAX_ISSUE_TITLE_LENGTH
} from '@groam/backend/convex/modules/travel/issues/lengths';
import type { Id } from '@groam/backend/data-model';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { FormSection } from '@groam/ui/components/form-section';
import { Input } from '@groam/ui/components/input';
import { RichTextEditor } from '@groam/ui/components/rich-text-editor';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useOpenSession } from '@groam/ui/hooks/use-open-session';
import { useState } from 'react';
import { useGenerateRule } from '@/features/issues/hooks/use-generate-rule';
import { useRuleDraft } from '@/features/issues/hooks/use-rule-draft';
import { useCreateIssue } from '@/features/issues/hooks/use-workspace-issues';
import { IssueRuleBuilder } from '@/features/issues/rule-builder/issue-rule-builder';
import { TripRequiredDialog } from '@/features/trips/trip-create/trip-required-dialog';
import { TripSelectField } from '@/features/trips/trip-forms/trip-select-field';
import { testIds } from '@/lib/test-ids';
import type { IssueFlagTarget } from '@/types/issues';
import { FlagTargetChip } from './flag-target-chip';

/** The title a flag starts from; the person finishes the question. */
function aboutTitle(about: IssueFlagTarget | undefined) {
  return about ? `Question about ${about.topic}`.slice(0, MAX_ISSUE_TITLE_LENGTH) : '';
}

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type CreateIssueDialogProps = {
  /** The plan item this issue is about; shown read-only and sent with the issue. */
  about?: IssueFlagTarget;
  onClose: () => void;
  onCreated: (issueId: Id<'tripIssues'>) => void;
  open: boolean;
  tripId?: Id<'trips'>;
  tripsLoading?: boolean;
  trips?: Array<{ id: Id<'trips'>; name: string }>;
};

/** Opens the issue form with a fresh draft each time; asks for a trip first when there is none. */
export function CreateIssueDialog(props: CreateIssueDialogProps) {
  const session = useOpenSession(props.open);
  const { onClose, open, tripId, trips, tripsLoading = false } = props;
  if (!tripsLoading && tripId === undefined && trips?.length === 0)
    return <TripRequiredDialog open={open} onClose={onClose} purpose="issue" />;
  return <CreateIssueForm key={session} {...props} />;
}

function CreateIssueForm({
  about,
  onClose,
  onCreated,
  open,
  tripId,
  trips,
  tripsLoading = false
}: CreateIssueDialogProps) {
  const createIssue = useCreateIssue();
  const form = useFormSubmit();
  const generate = useGenerateRule();
  const [title, setTitle] = useState(() => aboutTitle(about));
  const [body, setBody] = useState('');
  const rule = useRuleDraft(null, 'empty');
  const [selectedTripId, setSelectedTripId] = useState<Id<'trips'> | ''>(tripId ?? '');
  const resolvedTripId = tripId ?? (selectedTripId === '' ? undefined : selectedTripId);
  const needsTrip = tripId === undefined;

  const close = () => {
    if (form.isPending) return;
    onClose();
  };

  const submit = form.handle(async () => {
    if (!resolvedTripId) return;
    const issueId = await createIssue(
      resolvedTripId,
      title,
      body,
      about ? { ...rule.input, subject: about.subject } : rule.input
    );
    if (issueId) onCreated(issueId);
  });

  return (
    <FormDialog
      size="tall"
      description={
        about
          ? 'Ask the group about this part of the plan.'
          : 'Describe a question, decision, or problem for the group to resolve.'
      }
      error={form.error}
      isPending={form.isPending}
      onClose={close}
      onSubmit={submit}
      open={open}
      submitDisabled={!title.trim() || !resolvedTripId}
      submitLabel="Create issue"
      testId={testIds.createIssueDialog}
      title="New trip issue"
    >
      {needsTrip ? (
        <TripSelectField
          disabled={form.isPending}
          loading={tripsLoading}
          onChange={setSelectedTripId}
          testId={testIds.createIssueTrip}
          trips={trips}
          value={selectedTripId}
        />
      ) : null}
      {about ? <FlagTargetChip target={about} /> : null}
      <FormField label={about ? "What's the question?" : 'What should change?'} required>
        <Input
          autoFocus={!needsTrip}
          data-testid={testIds.createIssueTitle}
          disabled={form.isPending}
          maxLength={MAX_ISSUE_TITLE_LENGTH}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Add a day trip to the itinerary"
          value={title}
        />
      </FormField>
      <FormField label="Description" maxLength={MAX_ISSUE_BODY_LENGTH}>
        <RichTextEditor
          aria-label="Description"
          contentClassName="max-h-48 min-h-24 overflow-y-auto sm:max-h-72"
          disabled={form.isPending}
          onChange={setBody}
          placeholder="Share the context, desired outcome, and anything reviewers should consider…"
          testId={testIds.createIssueBody}
          toolbar
          value={body}
        />
      </FormField>
      <FormSection legend="Done when" optional separated>
        <IssueRuleBuilder
          disabled={form.isPending}
          draft={rule.draft}
          generate={generate}
          onChange={rule.setDraft}
        />
      </FormSection>
    </FormDialog>
  );
}
