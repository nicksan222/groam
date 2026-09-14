import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { Spinner } from '@groam/ui/components/spinner';
import { MoreHorizontal, Pencil, Plus, RotateCcw, Send, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  ideaCloseWithoutApplying,
  ideaCreateCta,
  ideaDeleteDraft,
  ideaEditDetails,
  ideaSendForReview
} from '@/features/ideas/idea-glossary';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripSection } from '@/features/trips/trip-sections';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { testIds } from '@/lib/test-ids';

import type { TripState } from './trip-detail-types';

function navigationItems({
  canEditDetails,
  closeIdea,
  edit,
  isRestoring,
  restore,
  startIdea,
  submit,
  trip
}: {
  canEditDetails: boolean;
  closeIdea?: () => void;
  edit: () => void;
  isRestoring: boolean;
  restore: () => void;
  startIdea?: () => void;
  submit?: () => void;
  trip: TripDetail;
}): Array<{
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  testId?: string;
  variant?: 'destructive';
}> {
  const items = [
    canEditDetails
      ? { icon: <Pencil />, label: ideaEditDetails, onClick: edit, testId: testIds.tripActionEdit }
      : null,
    submit ? { icon: <Send />, label: ideaSendForReview, onClick: submit } : null,
    startIdea && trip.permissions.canPropose && !trip.proposal
      ? { icon: <Plus />, label: ideaCreateCta, onClick: startIdea }
      : null,
    trip.permissions.canRestore
      ? {
          disabled: isRestoring,
          icon: isRestoring ? <Spinner /> : <RotateCcw />,
          label: 'Restore trip',
          onClick: restore,
          testId: testIds.tripActionRestore
        }
      : null,
    closeIdea &&
    trip.proposal &&
    ['conflicted', 'draft', 'in_review'].includes(trip.proposal.status)
      ? {
          icon: <Trash2 />,
          label: trip.proposal.status === 'draft' ? ideaDeleteDraft : ideaCloseWithoutApplying,
          onClick: closeIdea,
          testId: testIds.closeIdeaHeader,
          variant: 'destructive' as const
        }
      : null
  ];
  return items.filter((item) => item !== null);
}

export function TripNavigationActions({
  onCloseIdea,
  onEdit,
  onStartIdea,
  onSubmit,
  section,
  trip,
  tripState
}: {
  onCloseIdea?: () => void;
  onEdit: () => void;
  onStartIdea?: () => void;
  onSubmit?: () => void;
  section: TripSection;
  trip: TripDetail;
  tripState: TripState;
}) {
  const pending = useAsyncPending();
  const restore = async () => {
    await pending.run(async () => {
      await tripState.restore();
    });
  };
  const showPlanningActions = section === 'overview' || section === 'itinerary';
  const canEditDetails = trip.permissions.canEdit && showPlanningActions;
  const items = navigationItems({
    canEditDetails,
    closeIdea: onCloseIdea,
    edit: onEdit,
    isRestoring: pending.isPending,
    restore: () => void restore(),
    startIdea: onStartIdea,
    submit: onSubmit,
    trip
  });

  return (
    <div className="flex items-center gap-2">
      {canEditDetails ? (
        <Button onClick={onEdit} size="sm" type="button" variant="outline">
          <Pencil />
          {ideaEditDetails}
        </Button>
      ) : null}
      {items.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Trip actions"
              className="touch-manipulation"
              data-testid={testIds.tripActions}
              size="icon"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {items.map((item) => (
              <DropdownMenuItem
                data-testid={item.testId}
                disabled={item.disabled}
                key={item.label}
                onSelect={item.onClick}
                variant={item.variant}
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
