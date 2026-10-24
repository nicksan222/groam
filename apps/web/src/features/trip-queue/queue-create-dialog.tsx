import type { Id } from '@groam/backend/data-model';
import { CreateIssueDialog } from '@/features/issues/shared/create-issue-dialog';
import { CreatePollDialog } from '@/features/polls/create-poll/create-poll-dialog';
import { usePollActions } from '@/features/polls/hooks/use-polls';
import { useNavigate } from '@/lib/navigation/router';

/** The issue dialog the Issues queue opens; a created issue opens on its own page. */
function IssueCreate({
  onClose,
  open,
  tripId
}: {
  onClose: () => void;
  open: boolean;
  tripId: Id<'trips'>;
}) {
  const navigate = useNavigate();
  return (
    <CreateIssueDialog
      onClose={onClose}
      onCreated={(issueId) => {
        onClose();
        void navigate({ params: { issueId }, to: '/issues/$issueId' });
      }}
      open={open}
      tripId={tripId}
    />
  );
}

/** The poll dialog the Polls queue opens. */
function PollCreate({
  onClose,
  open,
  tripId
}: {
  onClose: () => void;
  open: boolean;
  tripId: Id<'trips'>;
}) {
  const { create } = usePollActions();
  return (
    <CreatePollDialog
      onClose={onClose}
      onCreate={(draft) => create({ ...draft, tripId })}
      open={open}
    />
  );
}

/** The creation dialog of a queue's kind, if it has one: ideas start from the page instead. */
export function QueueCreateDialog({
  kind,
  ...props
}: {
  kind: 'idea' | 'issue' | 'poll';
  onClose: () => void;
  open: boolean;
  tripId: Id<'trips'>;
}) {
  if (kind === 'issue') return <IssueCreate {...props} />;
  if (kind === 'poll') return <PollCreate {...props} />;
  return null;
}
