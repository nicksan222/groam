import type { Id } from '@groam/backend/data-model';
import type { ResearchBackendTarget as BackendTarget, ResearchLinkTarget } from '@/types/research';

/** Maps the flat UI target onto the backend's tagged union. */
export function toBackendTarget(target: ResearchLinkTarget): BackendTarget {
  if (target.kind === 'issue') return { issueId: target.id as Id<'tripIssues'>, kind: 'issue' };
  if (target.kind === 'idea') return { kind: 'idea', proposalId: target.id as Id<'tripProposals'> };
  if (target.kind === 'destination') {
    return {
      kind: 'tripTarget',
      target: { id: target.id as Id<'tripDestinations'>, type: 'destination' }
    };
  }
  if (target.kind === 'activity') {
    return {
      kind: 'tripTarget',
      target: { id: target.id as Id<'tripDestinationActivities'>, type: 'activity' }
    };
  }
  return {
    kind: 'tripTarget',
    target: { id: target.id as Id<'tripDestinationStays'>, type: 'stay' }
  };
}

/** Maps a backend link target back to the flat UI target. */
export function fromBackendTarget(target: BackendTarget): ResearchLinkTarget {
  if (target.kind === 'issue') return { id: target.issueId, kind: 'issue' };
  if (target.kind === 'idea') return { id: target.proposalId, kind: 'idea' };
  return { id: target.target.id, kind: target.target.type };
}
