import {
  MAX_STAY_ADDRESS_LENGTH,
  MAX_STAY_NOTES_LENGTH,
  MAX_STAY_TITLE_LENGTH
} from '@groam/backend/convex/modules/travel/stays/lengths';
import { X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { DayTimeRangePicker } from '@groam/ui/components/day-time-range-picker';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormAttachments } from '@groam/ui/components/form-attachments';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { RichTextEditor } from '@groam/ui/components/rich-text-editor';
import type { FormEvent, RefObject } from 'react';
import { mediaFileAccept } from '@/features/media/media-validation';
import {
  canSubmitStay,
  type StayDraft,
  stayCostError
} from '@/features/trips/hooks/trip-destination-form-state';
import { TripCostFields } from '@/features/trips/trip-forms/trip-cost-fields';
import { testIds } from '@/lib/test-ids';
import type { TripStayDestination } from './stay-types';

export function StayForm({
  currency,
  destination,
  draft,
  error,
  fileInputRef,
  isPending,
  isUploading,
  onCancel,
  onChange,
  onSubmit,
  onUpload,
  tripStartDate
}: {
  currency: string;
  destination: TripStayDestination;
  draft: StayDraft;
  error?: null | string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isPending: boolean;
  isUploading: boolean;
  onCancel: () => void;
  onChange: (patch: Partial<StayDraft>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpload: (files: FileList | null) => void;
  tripStartDate: null | string;
}) {
  const minimumDay = destination.startDay ?? 1;
  const maximumDay = destination.endDay ?? Math.max(minimumDay, Number(draft.checkOutDay));
  return (
    <Form
      actions={
        <FormActions
          className="border-t border-border pt-4"
          isPending={isPending}
          onCancel={onCancel}
          submitDisabled={!canSubmitStay(draft)}
          submitLabel="Save"
          submitTestId={testIds.staySave}
        />
      }
      className="rounded-2xl border border-border p-4 sm:p-6"
      density="relaxed"
      error={error}
      isPending={isPending}
      onSubmit={onSubmit}
    >
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="font-semibold tracking-tight">Stay details</p>
          <p className="mt-1 text-xs text-muted-foreground">Your place in {destination.name}</p>
        </div>
        <Button
          aria-label="Close stay editor"
          disabled={isPending}
          onClick={onCancel}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </div>
      <FormField label="Property or stay name" maxLength={MAX_STAY_TITLE_LENGTH} required>
        <Input
          data-testid={testIds.stayName}
          disabled={isPending}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="e.g. Hotel Lisboa"
          value={draft.title}
        />
      </FormField>
      <TripCostFields
        amount={draft.cost}
        currency={currency}
        disabled={isPending}
        error={stayCostError(draft.cost) ?? undefined}
        label="Estimated cost"
        onAmountChange={(cost) => onChange({ cost })}
        onSplitChange={(costSplit) => onChange({ costSplit })}
        split={draft.costSplit}
      />
      <DayTimeRangePicker
        bounds={{ maximumDay, minimumDay, startDate: tripStartDate }}
        disabled={isPending}
        label="Stay schedule"
        labels={{ end: 'Check out', start: 'Check in' }}
        onChange={({ endDay, endTime, startDay, startTime }) =>
          onChange({
            checkInDay: String(startDay),
            checkInTime: startTime,
            checkOutDay: String(endDay),
            checkOutTime: endTime
          })
        }
        value={{
          endDay: Number(draft.checkOutDay),
          endTime: draft.checkOutTime,
          startDay: Number(draft.checkInDay),
          startTime: draft.checkInTime
        }}
      />
      <FormField label="Address" maxLength={MAX_STAY_ADDRESS_LENGTH} optional>
        <Input
          disabled={isPending}
          onChange={(event) => onChange({ address: event.target.value })}
          placeholder="e.g. Rua Augusta 10, Lisbon"
          data-testid={testIds.stayAddress}
          value={draft.address}
        />
      </FormField>
      <FormField label="Notes" maxLength={MAX_STAY_NOTES_LENGTH} optional>
        <RichTextEditor
          aria-label="Notes"
          disabled={isPending}
          onChange={(notes) => onChange({ notes })}
          placeholder="e.g. Booking reference, room, check-in time"
          testId={testIds.stayNotes}
          toolbar
          value={draft.notes}
          variant="field"
        />
      </FormField>
      <FormAttachments
        accept={mediaFileAccept}
        attachments={draft.attachments}
        disabled={isPending}
        inputLabel="Upload stay booking files"
        inputRef={fileInputRef}
        isUploading={isUploading}
        legend="Booking files"
        max={5}
        onRemove={(id) =>
          onChange({ attachments: draft.attachments.filter((attachment) => attachment.id !== id) })
        }
        onUpload={onUpload}
      />
    </Form>
  );
}
