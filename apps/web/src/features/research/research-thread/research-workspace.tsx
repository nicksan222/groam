import type { Id } from '@groam/backend/data-model';
import Shell from '@groam/ui/components/shell/client';
import { useDiscussionThread } from '@/features/discussions/hooks/use-discussion-thread';
import { useResearchActions } from '@/features/research/hooks/use-research-actions';
import { useResearchLinkOptions } from '@/features/research/hooks/use-research-links';
import { useResearchRun } from '@/features/research/hooks/use-research-run';
import { useSaveResearchNote } from '@/features/research/hooks/use-save-research-note';
import { useNavigate } from '@/lib/navigation/router';
import type { ResearchDetail, ResearchLink } from '@/types/research';
import { ResearchComposer } from './research-composer';
import { ResearchCurrentAnswer } from './research-current-answer';
import { ResearchHeader } from './research-header';
import { ResearchLinkedItems } from './research-linked-items';
import { researchReportSummary } from './research-report';
import { ResearchSources } from './research-sources';
import { researchSources } from './research-sources-utils';
import { ResearchTimeline } from './research-timeline';

export function ResearchWorkspace({
  research,
  threadId,
  writable
}: {
  research: ResearchDetail;
  threadId: string | null;
  writable: boolean;
}) {
  const discussionId = research.id as Id<'discussions'>;
  const navigate = useNavigate();
  const actions = useResearchActions(discussionId);
  const { options } = useResearchLinkOptions(research.tripId as Id<'trips'>, research.links);
  const activity = useResearchRun(discussionId);
  const thread = useDiscussionThread(discussionId, threadId);
  const saveNote = useSaveResearchNote(discussionId);
  const report = activity.run?.report ?? null;
  const summary = researchReportSummary(report);
  const notes = thread.messages.filter((message) => ['user', 'assistant'].includes(message.role));
  const sources = researchSources([...thread.messages, { text: report ?? '' }]);
  const openLink = (link: ResearchLink) => {
    if (link.target.kind === 'issue')
      void navigate({ params: { issueId: link.target.id }, to: '/issues/$issueId' });
    else if (link.target.kind === 'idea')
      void navigate({ params: { proposalId: link.target.id }, to: '/ideas/$proposalId' });
  };
  return (
    <Shell>
      <Shell.BannerLayout>
        <ResearchHeader research={research} />
        <Shell.PageBody>
          <Shell.TwoColumns>
            <Shell.LeftColumn>
              {report ? (
                <ResearchCurrentAnswer
                  answer={summary.answer}
                  completedAt={activity.run?.completedAt ?? null}
                  report={report}
                />
              ) : null}
              <section aria-label="Research notebook" className="min-w-0 space-y-6">
                <ResearchTimeline
                  activity={activity}
                  caveat={summary.caveat}
                  notes={notes}
                  notesStatus={thread.status}
                  onLoadMore={() => thread.loadMore(30)}
                  onOpen={openLink}
                  onSaveBrief={actions.updateBrief}
                  research={research}
                  sourceCount={sources.length}
                  writable={writable}
                />
                {!writable ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    This trip is archived. Existing research is available to read.
                  </p>
                ) : activity.isLoading ? (
                  <p
                    aria-label="Loading research activity…"
                    className="text-sm text-muted-foreground"
                    role="status"
                  >
                    Loading research activity…
                  </p>
                ) : (
                  <ResearchComposer
                    busy={activity.isStarting || activity.isActive}
                    hasRun={Boolean(activity.run)}
                    noteDisabled={!threadId}
                    onAsk={activity.start}
                    onSaveNote={saveNote}
                    topic={research.title}
                  />
                )}
                {activity.error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {activity.error}
                  </p>
                ) : null}
              </section>
            </Shell.LeftColumn>
            <Shell.RightColumn>
              <ResearchLinkedItems
                onLink={actions.link}
                onOpen={openLink}
                onUnlink={actions.unlink}
                options={options}
                links={research.links}
                writable={writable}
              />
              <ResearchSources
                loading={Boolean(threadId) && thread.status === 'LoadingFirstPage'}
                sources={sources}
              />
            </Shell.RightColumn>
          </Shell.TwoColumns>
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}
