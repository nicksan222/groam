import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@groam/ui/components/sheet';
import Shell from '@groam/ui/components/shell/client';
import { useIsMobile } from '@groam/ui/hooks/use-mobile';
import { mutedMetaLinkClass } from '@groam/ui/lib/muted-meta';
import { ExternalLink, FileText, Paperclip, Pencil, Plus } from 'lucide-react';
import type { TripTransferInput } from '@/features/trips/hooks/use-trips';
import { formatTripLineCost } from '@/features/trips/trip-forms/trip-cost';
import { formatDayTimeRange } from '@/features/trips/trip-local-date-time';
import { TripTransferForm } from '@/features/trips/trip-transfer-form/trip-transfer-form';
import {
  formatTransferDuration,
  type TransferView,
  transportModeFor
} from '@/features/trips/trip-transfer-options';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { testIds } from '@/lib/test-ids';

export function TripTransferEditor({
  canManage,
  currency,
  fromLabel,
  kind,
  maximumDay,
  minimumDay,
  onRemove,
  onSave,
  toLabel,
  transfer,
  tripStartDate
}: {
  canManage: boolean;
  currency: string;
  fromLabel: string;
  kind: 'activity' | 'destination';
  maximumDay: number;
  minimumDay: number;
  onRemove: () => Promise<boolean>;
  onSave: (input: TripTransferInput) => Promise<boolean>;
  toLabel: string;
  transfer: null | TransferView;
  tripStartDate: null | string;
}) {
  const { closePanel, open: isEditing, openPanel } = useOpenState(false);
  const isMobile = useIsMobile();
  const form = (
    <TripTransferForm
      currency={currency}
      fromLabel={fromLabel}
      fullScreen={isMobile}
      initial={transfer}
      kind={kind}
      maximumDay={maximumDay}
      minimumDay={minimumDay}
      onCancel={closePanel}
      onRemove={onRemove}
      onSave={onSave}
      toLabel={toLabel}
      tripStartDate={tripStartDate}
    />
  );

  if (isEditing && isMobile) {
    return (
      <Sheet onOpenChange={(next) => !next && closePanel()} open>
        <SheetContent
          className="!inset-0 !h-dvh !w-screen !max-w-none gap-0 overflow-y-auto rounded-none border-0 p-0"
          side="right"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>
              Travel from {fromLabel} to {toLabel}
            </SheetTitle>
            <SheetDescription>Add transportation, timing, notes, and files.</SheetDescription>
          </SheetHeader>
          {form}
        </SheetContent>
      </Sheet>
    );
  }

  if (!transfer && !isEditing) {
    if (!canManage) return null;
    return <EmptyTransfer fromLabel={fromLabel} kind={kind} onEdit={openPanel} toLabel={toLabel} />;
  }

  const isDestination = kind === 'destination';

  return (
    <section className={isDestination ? 'mt-1' : 'py-2'}>
      {isEditing ? (
        isDestination ? (
          <Shell.Card className="w-full overflow-hidden" variant="well">
            {form}
          </Shell.Card>
        ) : (
          <div className="rounded-2xl border border-border">{form}</div>
        )
      ) : transfer ? (
        <TransferSummary
          canManage={canManage}
          currency={currency}
          kind={kind}
          onEdit={openPanel}
          toLabel={toLabel}
          transfer={transfer}
          tripStartDate={tripStartDate}
        />
      ) : null}
    </section>
  );
}

function EmptyTransfer({
  fromLabel,
  kind,
  onEdit,
  toLabel
}: {
  fromLabel: string;
  kind: 'activity' | 'destination';
  onEdit: () => void;
  toLabel: string;
}) {
  const label = kind === 'destination' ? 'Plan travel' : `Plan travel to ${toLabel}`;

  return (
    <button
      aria-label={`Plan travel from ${fromLabel} to ${toLabel}`}
      className="group flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-from={fromLabel}
      data-testid={testIds.planTravel}
      data-to={toLabel}
      onClick={onEdit}
      type="button"
    >
      <Plus className="size-3.5 shrink-0" />
      {label}
    </button>
  );
}

function TransferSummary({
  canManage,
  currency,
  kind,
  onEdit,
  toLabel,
  transfer,
  tripStartDate
}: {
  canManage: boolean;
  currency: string;
  kind: 'activity' | 'destination';
  onEdit: () => void;
  toLabel: string;
  transfer: TransferView;
  tripStartDate: null | string;
}) {
  const selectedMode = transportModeFor(transfer.mode);
  const exactTiming = transfer.timing
    ? formatDayTimeRange(
        tripStartDate,
        transfer.timing.startDay,
        transfer.timing.startTime,
        transfer.timing.endDay,
        transfer.timing.endTime
      )
    : null;
  const ModeIcon = selectedMode.icon;

  const isDestination = kind === 'destination';

  return (
    <div
      className={
        isDestination
          ? 'flex w-full flex-wrap items-center gap-x-2 gap-y-1 py-1 text-sm'
          : 'flex flex-wrap items-center gap-2 text-sm'
      }
    >
      <ModeIcon className="size-4 shrink-0 text-primary" />
      <span className="font-medium">{selectedMode.label}</span>
      {transfer.costAmount !== null && (
        <span className="font-medium">
          · {formatTripLineCost(transfer.costAmount, currency, transfer.costSplit)}
        </span>
      )}
      {transfer.durationMinutes !== null && (
        <span className="text-muted-foreground">
          · {formatTransferDuration(transfer.durationMinutes)}
        </span>
      )}
      {!isDestination && <span className="text-muted-foreground">to {toLabel}</span>}
      {exactTiming && <span className="font-medium">· {exactTiming}</span>}
      {transfer.notes && (
        <span className="max-w-56 truncate text-muted-foreground" title={transfer.notes}>
          · {transfer.notes}
        </span>
      )}
      {transfer.attachments.map((attachment) =>
        attachment.url ? (
          <a
            aria-label={`Open ${attachment.name}`}
            className={mutedMetaLinkClass('max-w-40')}
            href={attachment.url}
            key={attachment.id}
            rel="noreferrer"
            target="_blank"
          >
            <FileText className="size-3" />
            <span className="truncate">{attachment.name}</span>
            <ExternalLink className="size-3" />
          </a>
        ) : null
      )}
      {transfer.attachments.some((attachment) => !attachment.url) && (
        <Badge className="gap-1" variant="outline">
          <Paperclip className="size-3" /> {transfer.attachments.length}
        </Badge>
      )}
      {canManage && (
        <Button
          aria-label={`Edit travel to ${toLabel}`}
          data-testid={testIds.travelEdit}
          onClick={onEdit}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Pencil />
        </Button>
      )}
    </div>
  );
}
