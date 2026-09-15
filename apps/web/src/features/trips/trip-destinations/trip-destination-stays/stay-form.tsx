import { Button } from '@groam/ui/components/button';
import { DayTimeRangePicker } from '@groam/ui/components/day-time-range-picker';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { Spinner } from '@groam/ui/components/spinner';
import { Textarea } from '@groam/ui/components/textarea';
import { FileText, Paperclip, X } from 'lucide-react';
import type { RefObject } from 'react';
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
  fileInputRef,
  isPending,
  isUploading,
  onCancel,
  onChange,
  onSave,
  onUpload,
  tripStartDate
}: {
  currency: string;
  destination: TripStayDestination;
  draft: StayDraft;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isPending: boolean;
  isUploading: boolean;
  onCancel: () => void;
  onChange: (patch: Partial<StayDraft>) => void;
  onSave: () => void;
  onUpload: (files: FileList | null) => void;
  tripStartDate: null | string;
}) {
  const minimumDay = destination.startDay ?? 1;
  const maximumDay = destination.endDay ?? Math.max(minimumDay, Number(draft.checkOutDay));
  return (
    <div className="space-y-5 rounded-2xl border border-border p-4 sm:p-5">
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
          variant="ghost"
        >
          <X />
        </Button>
      </div>
      <div className="grid gap-3">
        <FormField label="Property or stay name">
          <Input
            data-testid={testIds.stayName}
            disabled={isPending}
            maxLength={100}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Hotel, apartment, hostel…"
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
      </div>
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
      <FormField label="Address">
        <Input
          disabled={isPending}
          maxLength={240}
          onChange={(event) => onChange({ address: event.target.value })}
          placeholder="Street, city, country"
          data-testid={testIds.stayAddress}
          value={draft.address}
        />
      </FormField>
      <FormField label="Notes">
        <Textarea
          disabled={isPending}
          maxLength={500}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="Booking reference, room details, check-in instructions…"
          data-testid={testIds.stayNotes}
          rows={3}
          value={draft.notes}
        />
      </FormField>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Booking files</p>
            <p className="text-xs text-muted-foreground">{draft.attachments.length} of 5 files</p>
          </div>
          <Button
            disabled={isPending || isUploading || draft.attachments.length >= 5}
            onClick={() => fileInputRef.current?.click()}
            type="button"
            variant="outline"
          >
            {isUploading ? <Spinner /> : <Paperclip />} Add files
          </Button>
          <Input
            accept={mediaFileAccept}
            aria-label="Upload stay booking files"
            className="sr-only"
            disabled={isPending || isUploading || draft.attachments.length >= 5}
            multiple
            onChange={(event) => onUpload(event.target.files)}
            ref={fileInputRef}
            type="file"
          />
        </div>
        {draft.attachments.map((attachment) => (
          <div className="flex items-center gap-2 rounded-xl border p-2" key={attachment.id}>
            <FileText className="size-4 text-primary" />
            <span className="min-w-0 flex-1 truncate text-sm">{attachment.name}</span>
            <Button
              aria-label={`Remove ${attachment.name}`}
              disabled={isPending || isUploading}
              onClick={() =>
                onChange({
                  attachments: draft.attachments.filter(({ id }) => id !== attachment.id)
                })
              }
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button disabled={isPending} onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
        <Button
          data-testid={testIds.staySave}
          disabled={isPending || !canSubmitStay(draft)}
          onClick={onSave}
          type="button"
        >
          {isPending && <Spinner />} Save stay
        </Button>
      </div>
    </div>
  );
}
