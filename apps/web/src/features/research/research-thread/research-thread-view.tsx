import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { DiscussionThreadBody } from '@/features/discussions/discussion-thread/discussion-thread-body';
import { researchCommands } from '@/features/research/hooks/research-commands';
import { useResearch } from '@/features/research/hooks/use-research';
import { useResearchActions } from '@/features/research/hooks/use-research-actions';
import { useResearchLinkOptions } from '@/features/research/hooks/use-research-links';
import { Link } from '@/features/workspace/navigation/router';
import type { ResearchDetail, ResearchLink } from '@/types/research';
import { ResearchHeader } from './research-header';
import { ResearchLinkEvent } from './research-link-event';

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
      <ResearchHeader research={research} />
      <ResearchThread
        discussionId={researchId}
        research={research}
        threadId={threadId}
        writable={writable}
      />
    </div>
  );
}

function ResearchThread({
  discussionId,
  research,
  threadId,
  writable
}: {
  discussionId: Id<'discussions'>;
  research: ResearchDetail;
  threadId: null | string;
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
  const canOpen = (link: ResearchLink) =>
    link.target.kind === 'issue' || link.target.kind === 'idea';

  const commands = researchCommands({
    linkOptions: options,
    onLink: (option) => actions.link(option.target),
    onSaveBrief: actions.updateBrief,
    onSummarize: actions.summarize,
    onUnlink: (link) => actions.unlink(link.target),
    research
  });

  const events = research.links.map((link) => ({
    content: (
      <ResearchLinkEvent
        link={link}
        onOpen={canOpen(link) ? openLink : undefined}
        onRemove={writable ? (removed) => void actions.unlink(removed.target) : undefined}
      />
    ),
    createdAt: link.createdAt,
    key: `link:${link.id}`
  }));

  return (
    <DiscussionThreadBody
      commands={writable ? commands : undefined}
      discussionId={discussionId}
      events={events}
      readOnlyNotice={writable ? undefined : archivedNotice}
      threadId={threadId}
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
