import { type KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { agentRunHref } from '@/features/agents/agent-run/agent-run-href';
import { useAgentRoster } from '@/features/agents/hooks/use-agent-roster';
import { useDiscussions } from '@/features/discussions/hooks/use-discussions';
import { useWorkspaceIdeas } from '@/features/ideas/hooks/use-workspace-ideas';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { useWorkspaceIssues } from '@/features/issues/hooks/use-workspace-issues';
import { useTrips } from '@/features/trips/hooks/use-trips';
import { useNavigate } from '@/lib/navigation/router';
import { useCommandPaletteChrome } from './command-palette-chrome';
import { buildCommandPaletteMatches, type CommandPaletteMatch } from './command-palette-results';

export function useCommandPalette() {
  const { closeAndClear, onOpenChange, open, query, setQuery, toggle } = useCommandPaletteChrome();
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const searchOpts = open ? { initialNumItems: 25 } : 'skip';
  const { trips } = useTrips(open ? { includeArchived: false, initialNumItems: 25 } : 'skip');
  const { proposals } = useWorkspaceIdeas(searchOpts);
  const { issues } = useWorkspaceIssues(searchOpts);
  const { discussions } = useDiscussions(open ? undefined : 'skip');
  const { agents } = useAgentRoster();

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setActiveIndex(0);
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

  const active = Math.min(activeIndex, Math.max(results.length - 1, 0));

  const search = useCallback(
    (next: string) => {
      setActiveIndex(0);
      setQuery(next);
    },
    [setQuery]
  );

  const onInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const next = nextActiveIndex(event, active, results.length);
      if (next !== null) {
        event.preventDefault();
        setActiveIndex(next);
      } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
        event.preventDefault();
        const result = results[active];
        if (result) go(result);
      }
    },
    [active, go, results]
  );

  return {
    activeIndex: active,
    go,
    onInputKeyDown,
    onOpenChange: (next: boolean) => {
      setActiveIndex(0);
      onOpenChange(next);
    },
    open,
    query,
    results,
    setActiveIndex,
    setQuery: search
  };
}

/** Arrow keys wrap; Ctrl/⌘ + Home/End jump, leaving plain Home/End to the caret. */
function nextActiveIndex(
  event: Pick<KeyboardEvent, 'ctrlKey' | 'key' | 'metaKey'>,
  active: number,
  count: number
) {
  const last = count - 1;
  if (last < 0) return null;
  if (event.key === 'ArrowDown') return active === last ? 0 : active + 1;
  if (event.key === 'ArrowUp') return active === 0 ? last : active - 1;
  if (!event.ctrlKey && !event.metaKey) return null;
  if (event.key === 'Home') return 0;
  return event.key === 'End' ? last : null;
}
