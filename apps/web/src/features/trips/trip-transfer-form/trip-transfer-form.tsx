import { Button } from '@groam/ui/components/button';
import { DayTimeRangePicker } from '@groam/ui/components/day-time-range-picker';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import Shell from '@groam/ui/components/shell/client';
import { Textarea } from '@groam/ui/components/textarea';
import { Clock3, X } from 'lucide-react';
import { useRef } from 'react';
import { useMediaUpload } from '@/features/media/hooks/use-media-upload';
import { useTripTransferForm } from '@/features/trips/hooks/use-trip-transfer-form';
import type { TripTransferInput } from '@/features/trips/hooks/use-trips';
import { TripCostFields } from '@/features/trips/trip-forms/trip-cost-fields';
import type { TransferView } from '@/features/trips/trip-transfer-options';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import { testIds } from '@/lib/test-ids';
import { TransferActions } from './transfer-actions';
import { TransferFeedback } from './transfer-feedback';
import { TransferFiles } from './transfer-files';
import { TransferRemoval } from './transfer-removal';
import { TransportModePicker } from './transport-mode-picker';

export function TripTransferForm({
  currency,
  fromLabel,
  fullScreen = false,
  initial,
  kind,
  maximumDay,
  minimumDay,
  onCancel,
  onRemove,
  onSave,
  toLabel,
  tripStartDate
}: {
  currency?: string;
  fromLabel: string;
  fullScreen?: boolean;
  initial: null | TransferView;
  kind: 'activity' | 'destination';
  maximumDay: number;
  minimumDay: number;
  onCancel: () => void;
  onRemove: () => Promise<boolean>;
  onSave: (input: TripTransferInput) => Promise<boolean>;
  toLabel: string;
  tripStartDate: null | string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMedia = useMediaUpload();
  const form = useTripTransferForm({ initial, kind, minimumDay, onRemove, onSave, uploadMedia });
  const {
    attachments,
    canSave,
    cost,
    costError,
    costSplit,
    duration,
    durationError,
    endDay,
    endTime,
    hasChanges,
    isBusy,
    isPending,
    isUploading,
    mode,
    notes,
    remove: removeTransfer,
    removeAttachment,
    save: saveTransfer,
    setCost,
    setCostSplit,
    setDuration,
    setExactTiming,
    setMode,
    setNotes,
    setTiming,
    startDay,
    startTime,
    status,
    timingEnabled,
    timingError,
    uploadFiles
  } = form;
  const confirm = useConfirm();

  const cancel = async () => {
    if (
      !hasChanges ||
      (await confirm('Discard unsaved travel?', 'Your edits to this transfer will be lost.'))
    ) {
      onCancel();
    }
  };
  const remove = async () => {
    if (
      !(await confirm(
        'Remove travel details?',
        `This removes travel from ${fromLabel} to ${toLabel}.`
      ))
    ) {
      return;
    }
    if (await removeTransfer()) onCancel();
  };
  const save = async () => {
    if (await saveTransfer()) onCancel();
  };
  const upload = async (files: FileList | null) => {
    try {
      await uploadFiles(files ? Array.from(files) : []);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={`${fullScreen ? 'min-h-dvh p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]' : 'p-4 sm:p-5'} space-y-5`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <Shell.Eyebrow tone="primary">Travel connection</Shell.Eyebrow>
          <h4 className="mt-2 text-base font-semibold tracking-tight">
            {fromLabel} <span className="text-muted-foreground">→</span> {toLabel}
          </h4>
        </div>
        <Button
          aria-label="Close travel editor"
          disabled={isBusy}
          onClick={cancel}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </div>

      <TransportModePicker disabled={isBusy} mode={mode} onChange={setMode} />
      <div className="border-t border-border pt-5 sm:max-w-64">
        <FormField error={durationError ?? undefined} label="Estimated minutes">
          <Input
            data-testid={testIds.travelMinutes}
            disabled={isBusy}
            max={10_080}
            min={1}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="45"
            type="number"
            value={duration}
          />
        </FormField>
      </div>

      <TripCostFields
        amount={cost}
        currency={currency}
        disabled={isBusy}
        error={costError ?? undefined}
        label="Estimated cost"
        onAmountChange={setCost}
        onSplitChange={setCostSplit}
        split={costSplit}
      />

      {timingEnabled ? (
        <div className="grid gap-3 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Exact departure &amp; arrival</p>
            <Button
              disabled={isBusy}
              onClick={() => setExactTiming(false)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Remove exact times
            </Button>
          </div>
          <DayTimeRangePicker
            bounds={{ maximumDay, minimumDay, startDate: tripStartDate }}
            disabled={isBusy}
            label="Travel schedule"
            labels={{ end: 'Arrival', start: 'Departure' }}
            onChange={setTiming}
            value={{ endDay, endTime, startDay, startTime }}
          />
          {timingError && endTime === '' && <FormFeedback error={timingError} />}
        </div>
      ) : (
        <Button
          className="h-10 w-full justify-start rounded-xl border-dashed text-xs"
          disabled={isBusy}
          onClick={() => setExactTiming(true)}
          type="button"
          variant="outline"
        >
          <Clock3 /> Add exact departure and arrival
        </Button>
      )}

      <FormField label="Travel notes">
        <Textarea
          data-testid={testIds.travelNotes}
          disabled={isBusy}
          maxLength={500}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Meeting point, booking reference, platform, directions…"
          rows={3}
          value={notes}
        />
      </FormField>

      <TransferFiles
        attachments={attachments}
        fileInputRef={fileInputRef}
        fromLabel={fromLabel}
        isBusy={isBusy}
        isUploading={isUploading}
        onRemove={removeAttachment}
        onUpload={(files) => void upload(files)}
        toLabel={toLabel}
      />

      <TransferFeedback status={status} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-4">
        <TransferRemoval
          hasChanges={hasChanges}
          initial={initial}
          isBusy={isBusy}
          onRemove={() => void remove()}
          status={status}
        />
        <TransferActions
          canSave={canSave}
          isBusy={isBusy}
          isPending={isPending}
          onCancel={cancel}
          onSave={() => void save()}
        />
      </div>
    </div>
  );
}
