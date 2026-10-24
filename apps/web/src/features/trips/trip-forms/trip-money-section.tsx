import { MAX_TRIP_BUDGET } from '@groam/backend/convex/modules/travel/trips/lengths';
import { Coins } from '@groam/icons';
import { FormField } from '@groam/ui/components/form-field';
import { FormSection } from '@groam/ui/components/form-section';
import { Input } from '@groam/ui/components/input';
import { TripCurrencySelect } from '@/features/trips/trip-forms/trip-currency-select';
import type { InformationSetter, TripInformationFormState } from '@/types/trips';

/** The "Money" group shared by creating and editing a trip. */
export function TripMoneySection({
  budgetError,
  budgetTestId,
  disabled,
  separated,
  setValue,
  value
}: {
  budgetError?: string;
  budgetTestId?: string;
  disabled: boolean;
  separated?: boolean;
  setValue: InformationSetter;
  value: Pick<TripInformationFormState, 'budget' | 'currency'>;
}) {
  return (
    <FormSection
      description="Pick a currency and, if you like, a group budget."
      icon={Coins}
      legend="Money"
      separated={separated}
    >
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <FormField label="Default currency" required>
          <TripCurrencySelect
            disabled={disabled}
            onChange={(currency) => setValue('currency', currency)}
            value={value.currency}
          />
        </FormField>
        <FormField
          description="The whole group’s budget, not per person."
          error={budgetError}
          label="Total group budget"
          optional
        >
          <Input
            data-testid={budgetTestId}
            disabled={disabled}
            max={MAX_TRIP_BUDGET}
            min={0}
            onChange={(event) => setValue('budget', event.target.value)}
            placeholder="e.g. 2500"
            step="0.01"
            type="number"
            value={value.budget}
          />
        </FormField>
      </div>
    </FormSection>
  );
}
