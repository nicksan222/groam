'use client';

import { DayRangePicker } from '@groam/ui/components/day-range-picker';
import { Input } from '@groam/ui/components/input';
import { Label } from '@groam/ui/components/label';
import { cn } from '@groam/ui/lib/utils';
import { useId } from 'react';

export type DayTimeRangeValue = {
  endDay: number;
  endTime: string;
  startDay: number;
  startTime: string;
};

export type DayTimeRangePickerProps = {
  bounds: {
    maximumDay: number;
    minimumDay?: number;
    startDate?: null | string;
    totalDays?: number;
  };
  className?: string;
  disabled?: boolean;
  label?: string;
  labels?: { end: string; start: string };
  onChange: (value: DayTimeRangeValue) => void;
  value: DayTimeRangeValue;
};

function timeRangeError(value: DayTimeRangeValue, startLabel: string, endLabel: string) {
  if (value.endTime !== '' && value.startTime === '') {
    return `Add ${startLabel.toLowerCase()} time first.`;
  }
  if (
    value.startTime !== '' &&
    value.endTime !== '' &&
    value.startDay === value.endDay &&
    value.endTime <= value.startTime
  ) {
    return `${endLabel} time must be after ${startLabel.toLowerCase()} time.`;
  }
  return null;
}

export function DayTimeRangePicker(props: DayTimeRangePickerProps) {
  const {
    bounds,
    className,
    disabled = false,
    label,
    labels = { end: 'End', start: 'Start' },
    onChange,
    value
  } = props;
  const errorMessage = timeRangeError(value, labels.start, labels.end);

  return (
    <fieldset
      aria-label={label}
      className={cn('grid min-w-0 gap-3', className)}
      disabled={disabled}
    >
      <DayRangePicker
        disabled={disabled}
        endDay={value.endDay}
        endLabel={labels.end}
        maximumDay={bounds.maximumDay}
        minimumDay={bounds.minimumDay}
        onChange={(startDay, endDay) =>
          onChange({
            ...value,
            endDay: endDay ?? value.endDay,
            startDay: startDay ?? value.startDay
          })
        }
        startDate={bounds.startDate}
        startDay={value.startDay}
        startLabel={labels.start}
        totalDays={bounds.totalDays}
      />
      <TimeFields
        endLabel={labels.end}
        errorMessage={errorMessage}
        onChange={onChange}
        startDate={bounds.startDate}
        startLabel={labels.start}
        value={value}
      />
    </fieldset>
  );
}

function TimeFields({
  endLabel,
  errorMessage,
  onChange,
  startDate,
  startLabel,
  value
}: {
  endLabel: string;
  errorMessage: null | string;
  onChange: (value: DayTimeRangeValue) => void;
  startDate?: null | string;
  startLabel: string;
  value: DayTimeRangeValue;
}) {
  const id = useId();
  const descriptionId = errorMessage ? `${id}-error` : `${id}-help`;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-start-time`}>{startLabel} time (optional)</Label>
          <Input
            aria-describedby={descriptionId}
            aria-invalid={errorMessage ? true : undefined}
            id={`${id}-start-time`}
            onChange={(event) => onChange({ ...value, startTime: event.target.value })}
            step={60}
            type="time"
            value={value.startTime}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-end-time`}>{endLabel} time (optional)</Label>
          <Input
            aria-describedby={descriptionId}
            aria-invalid={errorMessage ? true : undefined}
            id={`${id}-end-time`}
            onChange={(event) => onChange({ ...value, endTime: event.target.value })}
            step={60}
            type="time"
            value={value.endTime}
          />
        </div>
      </div>
      {errorMessage ? (
        <p className="text-xs font-medium text-destructive" id={`${id}-error`} role="alert">
          {errorMessage}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground" id={`${id}-help`}>
          {startDate
            ? 'Calendar dates follow the trip start date. Times are local to the destination.'
            : 'Set the trip start date to show calendar dates. Times are local to the destination.'}
        </p>
      )}
    </>
  );
}
