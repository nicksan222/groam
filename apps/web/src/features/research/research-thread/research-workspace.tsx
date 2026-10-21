import type { Id } from '@groam/backend/data-model';
import Shell from '@groam/ui/components/shell/client';
import { useState } from 'react';
import { useResearchActions } from '@/features/research/hooks/use-research-actions';
import { useResearchLinkOptions } from '@/features/research/hooks/use-research-links';
import { useNavigate } from '@/lib/navigation/router';
import type { ResearchDetail, ResearchLink } from '@/types/research';
import { ResearchBrief } from './research-brief';
import { ResearchHeader } from './research-header';
import { ResearchLinkedItems } from './research-linked-items';
import { ResearchNotebook } from './research-notebook';
import { ResearchRun } from './research-run';
import { ResearchSources } from './research-sources';

export function ResearchWorkspace({
  research,
  threadId,
  writable
}: {
  research: ResearchDetail;
  threadId: string | null;
  writable: boolean;
}) {
  const [view, setView] = useState('overview');
  const discussionId = research.id as Id<'discussions'>;
  const navigate = useNavigate();
  const actions = useResearchActions(discussionId);
  const { options } = useResearchLinkOptions(research.tripId as Id<'trips'>, research.links);
  const openLink = (link: ResearchLink) => {
    if (link.target.kind === 'issue')
      void navigate({ params: { issueId: link.target.id }, to: '/issues/$issueId' });
    else if (link.target.kind === 'idea')
      void navigate({ params: { proposalId: link.target.id }, to: '/ideas/$proposalId' });
  };
  return (
    <Shell>
      <Shell.BannerLayout>
        <ResearchHeader activeView={view} onViewChange={setView} research={research} />
        <Shell.PageBody variant="compact">
          <Shell.TwoColumns>
            <Shell.LeftColumn>
              <div hidden={view !== 'overview'}>
                <Shell.Card padding="md">
                  <ResearchRun
                    key={discussionId}
                    discussionId={discussionId}
                    topic={research.title}
                    writable={writable}
                  />
                </Shell.Card>
              </div>
              <div hidden={view !== 'notes'}>
                <ResearchNotebook
                  discussionId={discussionId}
                  threadId={threadId}
                  writable={writable}
                />
              </div>
            </Shell.LeftColumn>
            <Shell.RightColumn>
              <Shell.Card padding="md">
                <ResearchBrief
                  brief={research.brief}
                  canEdit={research.canManage && writable}
                  onSave={actions.updateBrief}
                />
              </Shell.Card>
              <Shell.Card padding="md">
                <ResearchSources
                  discussionId={discussionId}
                  threadId={threadId}
                  writable={writable}
                />
              </Shell.Card>
              <Shell.Card padding="md">
                <ResearchLinkedItems
                  onLink={actions.link}
                  onOpen={openLink}
                  onUnlink={actions.unlink}
                  options={options}
                  links={research.links}
                  writable={writable}
                />
              </Shell.Card>
            </Shell.RightColumn>
          </Shell.TwoColumns>
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}
