import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import { IdeaStatusBadge } from '@/features/ideas/idea-status-badge';
import { testIds } from '@/lib/test-ids';
import type { IdeaStatus } from '@/types/ideas';

/** The idea's state, as the chip after its title. */
export function IdeaHeaderStatus({ status }: { status: IdeaStatus }) {
  const idea = useOptionalIdeaContext();
  return (
    <span
      className="inline-flex **:data-[slot=badge]:h-6 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-3"
      data-testid={testIds.ideaStatusBadge}
    >
      <IdeaStatusBadge conflictCount={idea?.proposal?.conflicts.length ?? 0} status={status} />
    </span>
  );
}
