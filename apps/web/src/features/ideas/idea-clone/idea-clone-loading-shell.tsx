import type { Id } from '@groam/backend/data-model';
import { PageLoading } from '@groam/ui/components/page-loading';
import type { IdeaCloneView } from './idea-sections';

export function IdeaCloneLoadingShell(_props: { sharedTripId: Id<'trips'>; view: IdeaCloneView }) {
  return <PageLoading label="Loading idea…" />;
}
