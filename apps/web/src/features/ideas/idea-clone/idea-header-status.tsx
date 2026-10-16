import { Eye, Pencil } from 'lucide-react';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import { IdeaStatusBadge } from '@/features/ideas/idea-status-badge';
import { testIds } from '@/lib/test-ids';
import type { IdeaStatus } from '@/types/ideas';

const pillClass =
  'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-background/80 px-2.5 text-xs font-medium text-foreground backdrop-blur-sm';

/** What the viewer can do with this idea, its state, and which shared trip it belongs to. */
export function IdeaHeaderStatus({
  canEdit,
  reviewing,
  sharedTripName,
  status
}: {
  canEdit: boolean;
  reviewing: boolean;
  sharedTripName: string;
  status: IdeaStatus;
}) {
  const idea = useOptionalIdeaContext();
  const Icon = canEdit && !reviewing ? Pencil : Eye;
  let mode = 'Viewing idea · Read-only';
  if (reviewing) mode = 'Reviewing changes';
  else if (canEdit) mode = 'Editing idea';
  return (
    <>
      <span className={pillClass}>
        <Icon aria-hidden className="size-3" />
        {mode}
      </span>
      <span data-testid={testIds.ideaStatusBadge}>
        <IdeaStatusBadge conflictCount={idea?.proposal?.conflicts.length ?? 0} status={status} />
      </span>
      <span className={`${pillClass} hidden min-w-0 truncate font-normal sm:inline-flex`}>
        An idea for {sharedTripName}
      </span>
    </>
  );
}
