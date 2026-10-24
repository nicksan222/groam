import {
  MAX_TRIP_DATE_NOTES_LENGTH,
  MAX_TRIP_DAYS
} from '@groam/backend/convex/modules/travel/trips/lengths';
import { CalendarDays } from '@groam/icons';
import { DatePicker } from '@groam/ui/components/date-picker';
import { FormField } from '@groam/ui/components/form-field';
import { FormSection } from '@groam/ui/components/form-section';
import { Input } from '@groam/ui/components/input';
import type { InformationSetter, TripInformationFormState } from '@/types/trips';

/** The "When" group shared by creating and editing a trip. Omit `startDate` to hide that field. */
export function TripWhenSection({
  dateNotesTestId,
  disabled,
  durationError,
  durationTestId,
  separated,
  setValue,
  startDateTestId,
  value
}: {
  dateNotesTestId?: string;
  disabled: boolean;
  durationError?: string;
  durationTestId?: string;
  separated?: boolean;
  setValue: InformationSetter;
  startDateTestId?: string;
  value: Pick<TripInformationFormState, 'dateNotes' | 'totalDuration'> &
    Partial<Pick<TripInformationFormState, 'startDate'>>;
}) {
  return (
    <FormSection
      description="Exact dates or a rough idea — both work."
      icon={CalendarDays}
      legend="When"
      separated={separated}
    >
      <div className="grid items-start gap-4 sm:grid-cols-2">
        {value.startDate === undefined ? null : (
          <FormField label="Start date" optional>
            <DatePicker
              disabled={disabled}
              label="Start date"
              onChange={(date) => setValue('startDate', date ?? '')}
              testId={startDateTestId}
              value={value.startDate}
            />
          </FormField>
        )}
        <FormField error={durationError} label="Length (days)" optional>
          <Input
            data-testid={durationTestId}
            disabled={disabled}
            max={MAX_TRIP_DAYS}
            min={1}
            onChange={(event) => setValue('totalDuration', event.target.value)}
            placeholder="e.g. 7"
            type="number"
            value={value.totalDuration}
          />
        </FormField>
        <FormField
          className="sm:col-span-2"
          label="If dates are still open"
          maxLength={MAX_TRIP_DATE_NOTES_LENGTH}
          optional
        >
          <Input
            data-testid={dateNotesTestId}
            disabled={disabled}
            onChange={(event) => setValue('dateNotes', event.target.value)}
            placeholder="e.g. Late July"
            value={value.dateNotes}
          />
        </FormField>
      </div>
    </FormSection>
  );
}
