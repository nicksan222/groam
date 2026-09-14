import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo } from 'react';
import { agentRunHref } from '@/features/agents/agent-run/agent-run-href';
import { useAgentRoster } from '@/features/agents/hooks/use-agent-roster';
import { useDiscussions } from '@/features/discussions/hooks/use-discussions';
import { useWorkspaceIdeas } from '@/features/ideas/hooks/use-workspace-ideas';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { useWorkspaceIssues } from '@/features/issues/hooks/use-workspace-issues';
import { useTrips } from '@/features/trips/hooks/use-trips';
import { useCommandPaletteChrome } from './command-palette-chrome';
import { buildCommandPaletteMatches, type CommandPaletteMatch } from './command-palette-results';

export function useCommandPalette() {
  const { closeAndClear, onOpenChange, open, query, setQuery, toggle } = useCommandPaletteChrome();
  const navigate = useNavigate();
  const searchOpts = open ? { initialNumItems: 25 } : 'skip';
  const { trips } = useTrips(open ? { includeArchived: false, initialNumItems: 25 } : 'skip');
  const { proposals } = useWorkspaceIdeas(searchOpts);
  const { issues } = useWorkspaceIssues(searchOpts);
  const { discussions } = useDiscussions(open ? undefined : 'skip');
  const { agents } = useAgentRoster();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  const results = useMemo(
    () =>
      buildCommandPaletteMatches(
        query,
        {
          agents: agents ?? [],
          discussions,
          ideas: proposals,
          issues,
          trips
        },
        {
          agentHref: (agentId, runId) =>
            runId
              ? agentRunHref(agentId as never, runId as never)
              : { params: { agentId }, to: '/agents/$agentId' },
          ideaHref: (idea) =>
            ideaCloneHref({
              id: idea.id as never,
              sourceTripId: idea.sourceTripId as never
            })
        }
      ),
    [agents, discussions, issues, proposals, query, trips]
  );

  const go = useCallback(
    (result: CommandPaletteMatch) => {
      closeAndClear();
      void navigate(result.href as never);
    },
    [closeAndClear, navigate]
  );

  return {
    go,
    onOpenChange,
    open,
    query,
    results,
    setQuery
  };
}
