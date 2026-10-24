import type { Id } from '@groam/backend/data-model';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileDiff,
  GitMerge,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  SendHorizontal,
  Trash2,
  type Icon
} from '@groam/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import Shell from '@groam/ui/components/shell/client';
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
import { useNavigate } from '@/lib/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { IdeaPrimaryAction, IdeaStatus } from '@/types/ideas';
import type { IdeaCloneView } from './idea-sections';

/** The phone dock shows only an icon, so each way of moving an idea forward gets its own. */
const primaryIcons = {
  approve: Check,
  merge: GitMerge,
  rebase: RefreshCw,
  submit: SendHorizontal
} as const satisfies Record<IdeaPrimaryAction['intent'], Icon>;

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
    canEdit
      ? {
          disabled: pending,
          icon: <Pencil />,
          label: ideaEditDetails,
          onClick: onEdit,
          testId: testIds.tripActionEdit
        }
      : null,
    view !== 'compare' && isOpenIdea
      ? { icon: <FileDiff />, label: ideaOpenChanges, onClick: () => open('compare') }
      : null,
    view === 'compare' && status === 'draft' && canEdit
      ? { icon: <ArrowLeft />, label: ideaBackToEditing, onClick: () => open('itinerary') }
      : null,
    {
      icon: <ArrowRight />,
      label: ideaOpenSharedTrip,
      onClick: onOpenShared,
      testId: testIds.ideaOpenShared
    },
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Shell.Action
            className="touch-manipulation"
            data-testid={testIds.tripActions}
            icon={MoreHorizontal}
            iconOnly
            label="Idea actions"
            tone="secondary"
          />
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
      {primary ? (
        <Shell.Action
          data-testid={testIds.ideaPrimaryAction}
          desktopIcon={null}
          disabled={pending}
          icon={primaryIcons[primary.intent]}
          label={primary.label}
          onClick={onPrimary}
          pending={pending}
        />
      ) : null}
    </>
  );
}
