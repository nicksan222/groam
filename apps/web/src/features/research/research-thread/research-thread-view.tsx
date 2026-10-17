import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { DiscussionThreadBody } from '@/features/discussions/discussion-thread/discussion-thread-body';
import { useResearch } from '@/features/research/hooks/use-research';
import { useResearchActions } from '@/features/research/hooks/use-research-actions';
import { useResearchLinkOptions } from '@/features/research/hooks/use-research-links';
import { Link } from '@/features/workspace/navigation/router';
import type { LinkTargetOption, ResearchLink } from '@/types/research';
import { ResearchHeader } from './research-header';

const archivedNotice = 'This trip is archived';

export function ResearchThreadView({ researchId }: { researchId: Id<'discussions'> }) {
  const { isLoading, research, threadId, writable } = useResearch(researchId);

  useSetAgentContext(
    research
      ? {
          capabilities: ['research.read', 'research.post', 'research.link'],
          data: {
            brief: research.brief,
            canManage: research.canManage,
            links: research.links.map((link) => ({ kind: link.target.kind, label: link.label })),
            researchId: research.id,
            title: research.title,
            writable
          },
          description:
            'Help the group gather and summarize findings for this research. Use the linked trip items as context.',
          key: `research:${research.id}`,
          title: research.title
        }
      : null
  );

  if (isLoading) return <PageLoading label="Opening research…" />;
  if (!research) return <ResearchNotFound />;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <ResearchThreadHeader discussionId={researchId} research={research} writable={writable} />
      <DiscussionThreadBody
        discussionId={researchId}
        readOnlyNotice={writable ? undefined : archivedNotice}
        threadId={threadId}
      />
    </div>
  );
}

function ResearchThreadHeader({
  discussionId,
  research,
  writable
}: {
  discussionId: Id<'discussions'>;
  research: NonNullable<ReturnType<typeof useResearch>['research']>;
  writable: boolean;
}) {
  const navigate = useNavigate();
  const actions = useResearchActions(discussionId);
  const { options } = useResearchLinkOptions(research.tripId as Id<'trips'>, research.links);

  const openLink = (link: ResearchLink) => {
    if (link.target.kind === 'issue') {
      void navigate({ params: { issueId: link.target.id }, to: '/issues/$issueId' });
    } else if (link.target.kind === 'idea') {
      void navigate({ params: { proposalId: link.target.id }, to: '/ideas/$proposalId' });
    }
  };

  return (
    <ResearchHeader
      isSummarizing={actions.isSummarizing || !writable}
      linkOptions={writable ? options : []}
      onAddLink={(option: LinkTargetOption) => void actions.link(option.target)}
      onOpenLink={openLink}
      onRemoveLink={(link) => void actions.unlink(link.target)}
      onSaveBrief={(brief) => void actions.updateBrief(brief)}
      onSummarize={() => void actions.summarize()}
      research={research}
    />
  );
}

function ResearchNotFound() {
  return (
    <EmptyScreen
      buttonRaw={
        <Button asChild variant="outline">
          <Link to="/trips">Back to trips</Link>
        </Button>
      }
      description="It may have been removed, or you do not have access to this trip."
      headline="Research not found"
      icon={Search}
    />
  );
}
