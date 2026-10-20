import {
  Archive,
  Calendar,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2
} from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { Spinner } from '@groam/ui/components/spinner';
import type { ReactNode } from 'react';
import {
  ideaCloseWithoutApplying,
  ideaCreateCta,
  ideaDeleteDraft,
  ideaEditDetails,
  ideaSendForReview
} from '@/features/ideas/idea-glossary';
import { useArchiveTrip } from '@/features/trips/hooks/use-archive-trip';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import {
  exportTripCalendar,
  tripCalendarExportBlocker
} from '@/features/trips/trip-calendar-export';
import type { TripSection } from '@/features/trips/trip-sections';
import { testIds } from '@/lib/test-ids';

import type { TripState } from './trip-detail-types';

function navigationItems({
  archive,
  canEditDetails,
  closeIdea,
  edit,
  isRestoring,
  restore,
  startIdea,
  submit,
  trip
}: {
  archive: () => void;
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
    trip.proposal
      ? null
      : {
          disabled: tripCalendarExportBlocker(trip) !== null,
          icon: <Calendar />,
          label: 'Export calendar',
          onClick: () => exportTripCalendar(trip),
          testId: testIds.tripCalendarExport
        },
    trip.permissions.canRestore
      ? {
          disabled: isRestoring,
          icon: isRestoring ? <Spinner /> : <RotateCcw />,
          label: 'Restore trip',
          onClick: restore,
          testId: testIds.tripActionRestore
        }
      : null,
    !trip.proposal && trip.permissions.canArchive && trip.archivedAt === null
      ? {
          icon: <Archive />,
          label: 'Archive trip',
          onClick: archive,
          testId: testIds.tripArchive,
          variant: 'destructive' as const
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
  leading,
  onCloseIdea,
  onEdit,
  onStartIdea,
  onSubmit,
  section,
  trip,
  tripState
}: {
  /** Icon buttons that sit just before the actions menu. */
  leading?: ReactNode;
  onCloseIdea?: () => void;
  onEdit: () => void;
  onStartIdea?: () => void;
  onSubmit?: () => void;
  section: TripSection;
  trip: TripDetail;
  tripState: TripState;
}) {
  const { archive, isPending, restore } = useArchiveTrip(tripState);
  const showPlanningActions = section === 'overview' || section === 'itinerary';
  const canEditDetails = trip.permissions.canEdit && showPlanningActions;
  const items = navigationItems({
    archive: () => void archive(),
    canEditDetails,
    closeIdea: onCloseIdea,
    edit: onEdit,
    isRestoring: isPending,
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
      {leading}
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
