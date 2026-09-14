import { FormField } from '@groam/ui/components/form-field';
import { IconTile } from '@groam/ui/components/icon-tile';
import { Input } from '@groam/ui/components/input';
import type { LucideIcon } from 'lucide-react';
import { CalendarDays, ChevronDown, Coins, MapPinned } from 'lucide-react';
import type { ReactNode } from 'react';
import { TripDestinationPicker } from '@/features/trips/trip-destinations/trip-destination-picker';
import { TripCurrencySelect } from '@/features/trips/trip-forms/trip-currency-select';
import { testIds } from '@/lib/test-ids';
import type { InformationSetter, TripInformationFormState } from '@/types/trips';

export type { InformationSetter, TripInformationFormState };

function FormSection({
  children,
  description,
  icon: Icon,
  title
}: {
  children: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="w-full min-w-0 space-y-3 border-t border-border/70 pt-5">
      <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-2.5">
        <IconTile aria-hidden size="sm">
          <Icon className="size-3.5" />
        </IconTile>
        <div className="space-y-0.5 pt-0.5">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid items-start gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function TripInformationFields({
  disabled,
  setValue,
  value
}: {
  disabled: boolean;
  setValue: InformationSetter;
  value: TripInformationFormState;
}) {
  return (
    <div className="space-y-4">
      <FormField label="Trip name" required>
        <Input
          autoFocus
          data-testid={testIds.createTripName}
          disabled={disabled}
          maxLength={100}
          onChange={(event) => setValue('name', event.target.value)}
          placeholder="e.g. A weekend in Lisbon"
          required
          value={value.name}
        />
      </FormField>

      <FormSection
        description="Somewhere in mind? You can decide later, too."
        icon={MapPinned}
        title="Where"
      >
        <FormField className="sm:col-span-2" label="Destination">
          <TripDestinationPicker
            disabled={disabled}
            onChange={(status, destination) => {
              setValue('destinationStatus', status);
              setValue('destination', destination);
            }}
            status={value.destinationStatus}
            value={value.destination}
          />
        </FormField>
      </FormSection>

      <details className="group rounded-xl border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Add dates and budget
          <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
            Optional
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="space-y-5 px-4 pb-4">
          <FormSection
            description="Exact dates or a rough idea — both work."
            icon={CalendarDays}
            title="When"
          >
            <FormField label="Start date">
              <Input
                data-testid={testIds.createTripStartDate}
                disabled={disabled}
                onChange={(event) => setValue('startDate', event.target.value)}
                type="date"
                value={value.startDate}
              />
            </FormField>
            <FormField label="Length (days)">
              <Input
                data-testid={testIds.createTripDuration}
                disabled={disabled}
                max={365}
                min={1}
                onChange={(event) => setValue('totalDuration', event.target.value)}
                placeholder="7"
                type="number"
                value={value.totalDuration}
              />
            </FormField>
            <FormField className="sm:col-span-2" label="If dates are still open">
              <Input
                data-testid={testIds.createTripDateNotes}
                disabled={disabled}
                maxLength={240}
                onChange={(event) => setValue('dateNotes', event.target.value)}
                placeholder="Late July, or dates still open"
                value={value.dateNotes}
              />
            </FormField>
          </FormSection>

          <FormSection
            description="Set a currency and an optional group budget."
            icon={Coins}
            title="Money"
          >
            <FormField label="Default currency" required>
              <TripCurrencySelect
                disabled={disabled}
                onChange={(currency) => setValue('currency', currency)}
                value={value.currency}
              />
            </FormField>
            <FormField label="Total group budget">
              <Input
                disabled={disabled}
                min={1}
                onChange={(event) => setValue('budget', event.target.value)}
                placeholder="Optional — e.g. 2500"
                step="0.01"
                type="number"
                value={value.budget}
              />
            </FormField>
          </FormSection>
        </div>
      </details>
    </div>
  );
}
