import {
  MAX_ACTIVITY_ADDRESS_LENGTH,
  MAX_ACTIVITY_NOTES_LENGTH,
  MAX_ACTIVITY_TITLE_LENGTH
} from '@groam/backend/convex/modules/travel/activities/lengths';
import { CalendarDays, MoonStar, SunMedium, Sunrise } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@groam/ui/components/collapsible';
import { DayTimeRangePicker } from '@groam/ui/components/day-time-range-picker';
import { FormAttachments } from '@groam/ui/components/form-attachments';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { FormSection } from '@groam/ui/components/form-section';
import { Input } from '@groam/ui/components/input';
import { RichTextEditor } from '@groam/ui/components/rich-text-editor';
import { mediaFileAccept } from '@/features/media/media-validation';
import type { TripActivityEditor } from '@/features/trips/hooks/use-trip-activity-editor';
import { tripCostError } from '@/features/trips/trip-forms/trip-cost';
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
  compact = false
}: {
  editor: TripActivityEditor;
  compact?: boolean;
}) {
  return (
    <div className="space-y-6">
      <FormSection legend="The place">
        <FormField label="Activity" maxLength={MAX_ACTIVITY_TITLE_LENGTH} required>
          <Input
            data-testid={testIds.activityTitle}
            onChange={(event) => editor.patch({ title: event.target.value })}
            placeholder="What are we doing?"
            value={editor.title}
          />
        </FormField>
        <FormField
          description="Use the exact entrance or meeting point travelers should navigate to."
          label="Exact address"
          maxLength={MAX_ACTIVITY_ADDRESS_LENGTH}
          optional
        >
          <Input
            autoComplete="street-address"
            data-testid={testIds.activityAddress}
            onChange={(event) => editor.patch({ address: event.target.value })}
            placeholder="Street, number, postal code, city, country"
            value={editor.address}
          />
        </FormField>
      </FormSection>

      <FormSection legend="Time of day" separated>
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
      </FormSection>

      <Collapsible className="border-t border-border" defaultOpen={!compact}>
        {compact ? (
          <CollapsibleTrigger
            className="py-3 text-left text-sm font-medium text-primary hover:underline"
            data-testid={testIds.activityMoreOptions}
          >
            More options: dates, exact times, cost, notes and files
          </CollapsibleTrigger>
        ) : null}
        <CollapsibleContent keepMounted className="space-y-6 pt-6">
          <ActivityDayRange editor={editor} />
          <FormSection legend="Helpful details" separated>
            <TripCostFields
              amount={editor.cost}
              currency={editor.currency}
              error={tripCostError(editor.cost) ?? undefined}
              label="Estimated cost"
              onAmountChange={(cost) => editor.patch({ cost })}
              onSplitChange={(costSplit) => editor.patch({ costSplit })}
              split={editor.costSplit}
            />
            <FormField label="Notes" maxLength={MAX_ACTIVITY_NOTES_LENGTH} optional>
              <RichTextEditor
                aria-label="Notes"
                onChange={(notes) => editor.patch({ notes })}
                placeholder="Reservation, entrance, what to bring…"
                testId={testIds.activityNotes}
                toolbar
                value={editor.notes}
                variant="field"
              />
            </FormField>
            <FormAttachments
              accept={mediaFileAccept}
              attachments={editor.attachments}
              disabled={editor.isPending}
              inputLabel="Upload activity files"
              inputRef={editor.fileInputRef}
              isUploading={editor.isUploading}
              legend="Files"
              max={5}
              onRemove={editor.removeAttachment}
              onUpload={(files) => void editor.uploadAttachments(files)}
            />
            <FormFeedback message={editor.uploadMessage} />
          </FormSection>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
