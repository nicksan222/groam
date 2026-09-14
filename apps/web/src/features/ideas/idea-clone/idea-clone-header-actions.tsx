import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { Spinner } from '@groam/ui/components/spinner';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileDiff,
  MoreHorizontal,
  Pencil,
  Trash2
} from 'lucide-react';
import {
  ideaBackToEditing,
  ideaCloseWithoutApplying,
  ideaDeleteDraft,
  ideaEditDetails,
  ideaOpenChanges,
  ideaOpenSharedTrip,
  ideaResolveAndApply
} from '@/features/ideas/idea-glossary';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { testIds } from '@/lib/test-ids';
import type { IdeaPrimaryAction, IdeaStatus } from '@/types/ideas';
import type { IdeaCloneView } from './idea-sections';

const openStatuses = ['conflicted', 'draft', 'in_review'];

/** Keep editing and returning to the shared trip discoverable. */
export function IdeaCloneHeaderActions({
  canEdit = false,
  onCloseIdea,
  onEdit,
  onOpenShared,
  onPrimary,
  onResolve,
  pending = false,
  primary,
  proposalId,
  sharedTripId,
  status,
  view
}: {
  canEdit?: boolean;
  onCloseIdea?: () => void;
  onEdit: () => void;
  onOpenShared: () => void;
  onPrimary: () => void;
  onResolve?: () => void;
  pending?: boolean;
  primary: IdeaPrimaryAction | null;
  proposalId: Id<'tripProposals'>;
  sharedTripId: Id<'trips'>;
  status: IdeaStatus;
  view: IdeaCloneView;
}) {
  const navigate = useNavigate();
  const open = (next: IdeaCloneView) => {
    void navigate(ideaCloneHref({ id: proposalId, sourceTripId: sharedTripId }, next));
  };
  const isOpenIdea = openStatuses.includes(status);

  const items = [
    view !== 'compare' && isOpenIdea
      ? { icon: <FileDiff />, label: ideaOpenChanges, onClick: () => open('compare') }
      : null,
    view === 'compare' && status === 'draft' && canEdit
      ? { icon: <ArrowLeft />, label: ideaBackToEditing, onClick: () => open('itinerary') }
      : null,
    onResolve
      ? {
          disabled: pending,
          icon: <Check />,
          label: ideaResolveAndApply,
          onClick: onResolve
        }
      : null,
    onCloseIdea && isOpenIdea
      ? {
          icon: <Trash2 />,
          label: status === 'draft' ? ideaDeleteDraft : ideaCloseWithoutApplying,
          onClick: onCloseIdea,
          testId: testIds.closeIdeaHeader,
          variant: 'destructive' as const
        }
      : null
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button data-testid={testIds.ideaOpenShared} onClick={onOpenShared} size="sm" variant="ghost">
        <ArrowRight /> {ideaOpenSharedTrip}
      </Button>
      {canEdit ? (
        <Button
          data-testid={testIds.tripActionEdit}
          disabled={pending}
          onClick={onEdit}
          size="sm"
          variant="outline"
        >
          <Pencil /> {ideaEditDetails}
        </Button>
      ) : null}
      {primary ? (
        <Button
          data-testid={testIds.ideaPrimaryAction}
          disabled={pending}
          onClick={onPrimary}
          size="sm"
        >
          {pending ? <Spinner /> : null}
          {primary.label}
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Idea actions"
            className="touch-manipulation"
            data-testid={testIds.tripActions}
            size="icon"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {items.map((item) => (
            <DropdownMenuItem
              data-testid={'testId' in item ? item.testId : undefined}
              disabled={'disabled' in item ? item.disabled : undefined}
              key={item.label}
              onSelect={item.onClick}
              variant={'variant' in item ? item.variant : undefined}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
