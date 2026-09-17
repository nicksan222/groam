import { Button } from '@groam/ui/components/button';
import { DayTimeRangePicker } from '@groam/ui/components/day-time-range-picker';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import Shell from '@groam/ui/components/shell/client';
import { Spinner } from '@groam/ui/components/spinner';
import { Textarea } from '@groam/ui/components/textarea';
import { CalendarDays, FileText, MoonStar, Paperclip, SunMedium, Sunrise, X } from 'lucide-react';
import { mediaFileAccept } from '@/features/media/media-validation';
import type { TripActivityEditor } from '@/features/trips/hooks/use-trip-activity-editor';
import { TripCostFields } from '@/features/trips/trip-forms/trip-cost-fields';
import { testIds } from '@/lib/test-ids';

const timeBlocks = [
  { icon: CalendarDays, label: 'Full day', value: 'full_day' },
  { icon: Sunrise, label: 'Morning', value: 'morning' },
  { icon: SunMedium, label: 'Afternoon', value: 'afternoon' },
  { icon: MoonStar, label: 'Evening', value: 'evening' }
] as const;

function ActivityDayRange({ editor }: { editor: TripActivityEditor }) {
  const minimumDay = editor.dayOptions[0] ?? 1;
  const maximumDay = editor.dayOptions[editor.dayOptions.length - 1] ?? minimumDay;
  return (
    <DayTimeRangePicker
      bounds={{ maximumDay, minimumDay, startDate: editor.tripStartDate }}
      label="Activity schedule"
      labels={{ end: 'End', start: 'Start' }}
      onChange={({ endDay, endTime, startDay, startTime }) =>
        editor.patch({
          dayNumber: String(startDay),
          endDayNumber: String(endDay),
          endTime,
          startTime
        })
      }
      value={{
        endDay: Number(editor.endDayNumber),
        endTime: editor.endTime,
        startDay: Number(editor.dayNumber),
        startTime: editor.startTime
      }}
    />
  );
}

export function TripActivityFields({
  editor,
  idPrefix
}: {
  editor: TripActivityEditor;
  idPrefix: string;
}) {
  const fieldId = (field: string) => `${idPrefix}-${field}-${editor.destinationId}`;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <Shell.Eyebrow tone="primary">The place</Shell.Eyebrow>
        <FormField label="Activity" required>
          <Input
            className="h-11 bg-background text-base"
            data-testid={testIds.activityTitle}
            maxLength={100}
            onChange={(event) => editor.patch({ title: event.target.value })}
            placeholder="What are we doing?"
            value={editor.title}
          />
        </FormField>
        <FormField
          description="Use the exact entrance or meeting point travelers should navigate to."
          label="Exact address"
        >
          <Input
            autoComplete="street-address"
            className="h-11 bg-background text-base"
            data-testid={testIds.activityAddress}
            maxLength={240}
            onChange={(event) => editor.patch({ address: event.target.value })}
            placeholder="Street, number, postal code, city, country"
            value={editor.address}
          />
        </FormField>
      </section>

      <section className="space-y-3 border-t pt-5">
        <Shell.Eyebrow tone="primary">When</Shell.Eyebrow>
        <ActivityDayRange editor={editor} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {timeBlocks.map(({ icon: Icon, label, value }) => (
            <Button
              aria-pressed={editor.timeBlock === value}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${
                editor.timeBlock === value
                  ? 'border-primary text-primary ring-1 ring-primary/30'
                  : 'border-border text-foreground'
              }`}
              key={value}
              onClick={() => editor.patch({ timeBlock: value })}
              type="button"
              unstyled
            >
              <Icon className="size-4" /> {label}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t pt-5">
        <Shell.Eyebrow tone="primary">Helpful details</Shell.Eyebrow>
        <TripCostFields
          amount={editor.cost}
          currency={editor.currency}
          label="Estimated cost"
          onAmountChange={(cost) => editor.patch({ cost })}
          onSplitChange={(costSplit) => editor.patch({ costSplit })}
          split={editor.costSplit}
        />
        <FormField label="Notes">
          <Textarea
            data-testid={testIds.activityNotes}
            maxLength={240}
            onChange={(event) => editor.patch({ notes: event.target.value })}
            placeholder="Reservation, entrance, what to bring…"
            rows={3}
            value={editor.notes}
          />
        </FormField>
        <label
          className="flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-primary/35 bg-card p-4"
          htmlFor={fieldId('files')}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            {editor.isUploading ? <Spinner /> : <Paperclip className="size-4" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">
              {editor.attachments.length} of 5 files
            </span>
            <span className="block text-xs font-normal text-muted-foreground">
              Tickets, bookings, maps, photos, audio, or video
            </span>
          </span>
          <Input
            accept={mediaFileAccept}
            className="sr-only"
            disabled={editor.isPending || editor.isUploading || editor.attachments.length >= 5}
            id={fieldId('files')}
            multiple
            onChange={(event) => void editor.uploadAttachments(event.target.files)}
            ref={editor.fileInputRef}
            type="file"
          />
        </label>
        {editor.attachments.length > 0 && (
          <div className="space-y-2 sm:flex sm:flex-wrap">
            {editor.attachments.map((attachment) => (
              <div
                className="flex items-center gap-2 rounded-xl border p-3 sm:max-w-64"
                key={attachment.id}
              >
                <FileText className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {attachment.name}
                </span>
                <Button
                  aria-label={`Remove ${attachment.name}`}
                  onClick={() => editor.removeAttachment(attachment.id)}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
        )}
        <FormFeedback message={editor.uploadMessage} />
      </section>
    </div>
  );
}
