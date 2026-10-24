import { MAX_TRANSFER_NOTES_LENGTH } from '@groam/backend/convex/modules/travel/transfers/lengths';
import { Clock3, X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { DayTimeRangePicker } from '@groam/ui/components/day-time-range-picker';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import { FormSection } from '@groam/ui/components/form-section';
import { Input } from '@groam/ui/components/input';
import { RichTextEditor } from '@groam/ui/components/rich-text-editor';
import Shell from '@groam/ui/components/shell/client';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useRef } from 'react';
import { useMediaUpload } from '@/features/media/hooks/use-media-upload';
import { useTripTransferForm } from '@/features/trips/hooks/use-trip-transfer-form';
import type { TripTransferInput } from '@/features/trips/hooks/use-trips';
import { TripCostFields } from '@/features/trips/trip-forms/trip-cost-fields';
import type { TransferView } from '@/features/trips/trip-transfer-options';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import { testIds } from '@/lib/test-ids';
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
  const submit = useFormSubmit();

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
  const save = submit.handle(async () => {
    if (await saveTransfer()) onCancel();
  });
  const upload = async (files: FileList | null) => {
    try {
      await uploadFiles(files ? Array.from(files) : []);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Form
      className={
        fullScreen ? 'min-h-dvh p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]' : 'p-4 sm:p-6'
      }
      density="relaxed"
      error={status?.kind === 'error' ? status.message : submit.error}
      message={status?.kind === 'warning' ? status.message : null}
      isPending={isPending}
      onSubmit={save}
      actions={
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-4">
          <TransferRemoval
            hasChanges={hasChanges}
            initial={initial}
            isBusy={isBusy}
            onRemove={() => void remove()}
            status={status}
          />
          <FormActions
            className="ml-auto w-auto"
            isPending={isPending}
            onCancel={() => void cancel()}
            submitDisabled={!canSave}
            submitLabel="Save"
            submitTestId={testIds.travelSave}
          />
        </div>
      }
    >
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <Shell.Eyebrow size="label" strong tone="primary">
            Travel connection
          </Shell.Eyebrow>
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
      <div className="border-t border-border pt-6 sm:max-w-64">
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
        <FormSection
          className="rounded-xl border border-border p-4"
          error={timingError && endTime === '' ? timingError : null}
          hint={
            <Button
              disabled={isBusy}
              onClick={() => setExactTiming(false)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Remove exact times
            </Button>
          }
          legend="Exact departure & arrival"
        >
          <DayTimeRangePicker
            bounds={{ maximumDay, minimumDay, startDate: tripStartDate }}
            disabled={isBusy}
            label="Travel schedule"
            labels={{ end: 'Arrival', start: 'Departure' }}
            onChange={setTiming}
            value={{ endDay, endTime, startDay, startTime }}
          />
        </FormSection>
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

      <FormField label="Travel notes" maxLength={MAX_TRANSFER_NOTES_LENGTH} optional>
        <RichTextEditor
          aria-label="Travel notes"
          disabled={isBusy}
          onChange={setNotes}
          placeholder="Meeting point, booking reference, platform, directions…"
          testId={testIds.travelNotes}
          toolbar
          value={notes}
          variant="field"
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
    </Form>
  );
}
