import type { Id } from '@groam/backend/data-model';
import { useCallback } from 'react';
import type { ResearchLinkTarget } from '@/types/research';
import { useCreateResearch, useLinkResearch } from './use-research-actions';

/** Starts a research and links it to `target`; resolves to whether both steps worked. */
export function useCreateLinkedResearch(tripId: Id<'trips'>, target: ResearchLinkTarget) {
  const createResearch = useCreateResearch(tripId);
  const link = useLinkResearch();
  return useCallback(
    async (input: { brief?: string; subject: string }) => {
      const id = await createResearch(input);
      return id ? link(id, target) : false;
    },
    [createResearch, link, target]
  );
}
