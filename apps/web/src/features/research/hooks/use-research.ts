import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';
import type { ResearchDetail } from '@/types/research';
import { fromBackendTarget } from './research-link-target';

function linkHref(link: { kind: string; shortId: null | string }): null | string {
  if (!link.shortId) return null;
  if (link.kind === 'issue') return `/issues/${link.shortId}`;
  if (link.kind === 'idea') return `/ideas/${link.shortId}`;
  return null;
}

export function useResearch(discussionId: Id<'discussions'>) {
  const result = useQuery(api.routes.discussions.research.get.run, { discussionId });
  const research: ResearchDetail | undefined = useMemo(
    () =>
      result && {
        brief: result.brief,
        canManage: result.canManage,
        id: result.id,
        links: result.links.map((link) => ({
          href: linkHref(link),
          id: link.id,
          label: link.label,
          target: fromBackendTarget(link.target)
        })),
        shortId: result.shortId,
        title: result.title,
        tripId: result.tripId
      },
    [result]
  );
  return {
    isLoading: result === undefined,
    research,
    threadId: result?.threadId ?? null,
    writable: result?.writable ?? false
  };
}
