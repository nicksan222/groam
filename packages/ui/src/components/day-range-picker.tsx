'use client';

import { cn } from '@groam/ui/lib/utils';
import { useRef, useState } from 'react';

const dayDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC'
});

const dayOfMonthFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  timeZone: 'UTC'
});

function tripDate(startDate: string, day: number) {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date;
}

function dateForDay(startDate: string, day: number) {
  return dayDateFormatter.format(tripDate(startDate, day));
}

function dayOfMonthForDay(startDate: string, day: number) {
  return dayOfMonthFormatter.format(tripDate(startDate, day));
}

function orderedRange(first: number, second: number): [number, number] {
  return first <= second ? [first, second] : [second, first];
}

function dayFromPoint(clientX: number, clientY: number) {
  const target = document.elementFromPoint(clientX, clientY);
  const node = target?.closest('[data-day]');
  if (!(node instanceof HTMLElement)) return null;
  const day = Number(node.dataset.day);
  return Number.isInteger(day) ? day : null;
}

function selectionSummary(
  startDay: number | undefined,
  endDay: number | undefined,
  startLabel: string,
  endLabel: string
) {
  if (startDay === undefined && endDay === undefined) {
    return 'Click a start day, then an end day. Drag across days to paint a stay.';
  }
  if (startDay !== undefined && endDay === undefined) {
    return `${startLabel} Day ${startDay} — pick ${endLabel.toLowerCase()} day`;
  }
  if (startDay !== undefined && endDay !== undefined) {
    const duration = endDay - startDay + 1;
    const range =
      startDay === endDay
        ? `${startLabel} and ${endLabel} Day ${startDay}`
        : `${startLabel} Day ${startDay} · ${endLabel} Day ${endDay}`;
    return duration === 1 ? range : `${duration} days · ${range}`;
  }
  return 'Click a start day, then an end day. Drag across days to paint a stay.';
}

export type DayRangePickerProps = {
  className?: string;
  disabled?: boolean;
  endDay: number | undefined;
  endLabel?: string;
  label?: string;
  maximumDay: number;
  minimumDay?: number;
  onChange: (startDay: number | undefined, endDay: number | undefined) => void;
  startDate?: null | string;
  startDay: number | undefined;
  startLabel?: string;
  takenDays?: ReadonlySet<number>;
  totalDays?: number;
};

export function DayRangePicker({
  className,
  disabled = false,
  endDay,
  endLabel = 'End',
  label,
  maximumDay,
  minimumDay = 1,
  onChange,
  startDate,
  startDay,
  startLabel = 'Start',
  takenDays,
  totalDays
}: DayRangePickerProps) {
  const safeMinimum = Math.min(minimumDay, maximumDay);
  const dayCount = totalDays ?? maximumDay;
  const days = Array.from({ length: dayCount }, (_, index) => index + 1);
  const [anchorDay, setAnchorDay] = useState<number | null>(null);
  const summary = selectionSummary(startDay, endDay, startLabel, endLabel);

  return (
    <fieldset
      aria-label={label}
      className={cn('min-w-0 space-y-3', className)}
      data-disabled={disabled ? '' : undefined}
      disabled={disabled}
    >
      <p className="text-xs text-muted-foreground">{summary}</p>

      <div className="rounded-xl border border-border bg-background p-2">
        <DayStrip
          anchorDay={anchorDay}
          disabled={disabled}
          days={days}
          endDay={endDay}
          endLabel={endLabel}
          maximumDay={maximumDay}
          minimumDay={safeMinimum}
          onChange={onChange}
          setAnchorDay={setAnchorDay}
          startDate={startDate}
          startDay={startDay}
          startLabel={startLabel}
          takenDays={takenDays}
        />
      </div>
    </fieldset>
  );
}

function DayStrip({
  anchorDay,
  days,
  disabled,
  endDay,
  endLabel,
  maximumDay,
  minimumDay,
  onChange,
  setAnchorDay,
  startDate,
  startDay,
  startLabel,
  takenDays
}: {
  anchorDay: number | null;
  days: number[];
  disabled: boolean;
  endDay: number | undefined;
  endLabel: string;
  maximumDay: number;
  minimumDay: number;
  onChange: (startDay: number | undefined, endDay: number | undefined) => void;
  setAnchorDay: (day: number | null) => void;
  startDate?: null | string;
  startDay: number | undefined;
  startLabel: string;
  takenDays?: ReadonlySet<number>;
}) {
  const originRef = useRef<number | null>(null);
  const skipClickRef = useRef(false);
  const endPointer = () => {
    originRef.current = null;
    if (skipClickRef.current) {
      requestAnimationFrame(() => {
        skipClickRef.current = false;
      });
    }
  };

  return (
    <div
      className="grid touch-none select-none grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2"
      data-testid="day-range-days"
      onPointerCancel={endPointer}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return;
        const day = dayFromPoint(event.clientX, event.clientY);
        if (day == null || isDayBlocked(day, minimumDay, maximumDay, takenDays, startDay, endDay)) {
          return;
        }
        originRef.current = day;
        skipClickRef.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onLostPointerCapture={endPointer}
      onPointerMove={(event) => {
        if (originRef.current == null) return;
        const day = dayFromPoint(event.clientX, event.clientY);
        if (day == null || day === originRef.current) return;
        if (isDayBlocked(day, minimumDay, maximumDay, takenDays, startDay, endDay)) return;
        skipClickRef.current = true;
        setAnchorDay(null);
        const [nextStart, nextEnd] = orderedRange(originRef.current, day);
        onChange(nextStart, nextEnd);
      }}
      onPointerUp={endPointer}
    >
      {days.map((day) => {
        const inRange =
          startDay !== undefined && endDay !== undefined && day >= startDay && day <= endDay;
        const isStart = startDay !== undefined && day === startDay;
        const isEnd = endDay !== undefined && day === endDay;
        const isPendingStart = endDay === undefined && startDay !== undefined && day === startDay;
        const isAnchor = day === anchorDay;
        const isTaken = Boolean(takenDays?.has(day) && !inRange && !isPendingStart);
        const isOutOfBounds = day < minimumDay || day > maximumDay;
        const isBlocked = isDayBlocked(day, minimumDay, maximumDay, takenDays, startDay, endDay);
        const date = startDate ? dayOfMonthForDay(startDate, day) : null;
        return (
          <button
            aria-label={dayCellLabel({
              date: startDate ? dateForDay(startDate, day) : null,
              day,
              endLabel,
              isEnd,
              isStart: isStart || isPendingStart,
              isTaken,
              startLabel
            })}
            aria-pressed={inRange || isPendingStart}
            className={cn(
              'flex min-h-12 flex-col items-center justify-center rounded-lg border border-border bg-background px-1 py-1.5 text-center shadow-xs transition-colors',
              'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              inRange && 'bg-primary text-primary-foreground',
              isPendingStart &&
                !inRange &&
                'bg-primary/15 text-foreground ring-1 ring-inset ring-primary/40',
              !inRange &&
                !isPendingStart &&
                !isTaken &&
                !isOutOfBounds &&
                'text-muted-foreground hover:border-primary/50 hover:text-foreground hover:shadow-sm',
              isTaken &&
                'cursor-not-allowed bg-muted/60 text-muted-foreground line-through decoration-muted-foreground/70',
              isOutOfBounds && !isTaken && 'cursor-not-allowed text-muted-foreground/45',
              stayCellRadius({
                inRange: inRange || isPendingStart,
                isEnd,
                isStart: isStart || isPendingStart
              }),
              isAnchor && 'z-10 ring-2 ring-ring ring-offset-2 ring-offset-background'
            )}
            data-day={day}
            data-taken={isTaken ? '' : undefined}
            disabled={disabled || isBlocked}
            key={day}
            onClick={() => {
              if (skipClickRef.current) {
                skipClickRef.current = false;
                return;
              }
              if (isBlocked) return;

              if (startDay !== undefined && endDay !== undefined) {
                if (day === startDay && day === endDay) {
                  onChange(undefined, undefined);
                  setAnchorDay(null);
                  return;
                }
                onChange(day, undefined);
                setAnchorDay(day);
                return;
              }

              const anchor = anchorDay ?? startDay;
              if (anchor == null) {
                onChange(day, undefined);
                setAnchorDay(day);
                return;
              }

              if (anchor === day) {
                onChange(undefined, undefined);
                setAnchorDay(null);
                return;
              }

              const [nextStart, nextEnd] = orderedRange(anchor, day);
              onChange(nextStart, nextEnd);
              setAnchorDay(null);
            }}
            type="button"
          >
            <span className="text-sm font-semibold tabular-nums leading-none">{day}</span>
            {date && (
              <span
                className={cn(
                  'mt-1 text-[10px] tabular-nums leading-none',
                  inRange || isPendingStart
                    ? inRange
                      ? 'text-primary-foreground/80'
                      : 'text-foreground/70'
                    : 'text-muted-foreground'
                )}
              >
                {date}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function isDayBlocked(
  day: number,
  minimumDay: number,
  maximumDay: number,
  takenDays: ReadonlySet<number> | undefined,
  startDay: number | undefined,
  endDay: number | undefined
) {
  if (day < minimumDay || day > maximumDay) return true;
  const inRange =
    startDay !== undefined && endDay !== undefined && day >= startDay && day <= endDay;
  const isPendingStart = endDay === undefined && startDay !== undefined && day === startDay;
  if (takenDays?.has(day) && !inRange && !isPendingStart) return true;
  return false;
}

function stayCellRadius({
  inRange,
  isEnd,
  isStart
}: {
  inRange: boolean;
  isEnd: boolean;
  isStart: boolean;
}) {
  if (!inRange) return 'rounded-lg';
  if (isStart && isEnd) return 'rounded-lg';
  if (isStart) return 'rounded-l-lg';
  if (isEnd) return 'rounded-r-lg';
  return undefined;
}

function dayCellLabel({
  date,
  day,
  endLabel,
  isEnd,
  isStart,
  isTaken,
  startLabel
}: {
  date: null | string;
  day: number;
  endLabel: string;
  isEnd: boolean;
  isStart: boolean;
  isTaken: boolean;
  startLabel: string;
}) {
  const parts = [`Day ${day}`];
  if (date) parts.push(date);
  if (isTaken) parts.push('Taken');
  if (isStart && isEnd) parts.push(`${startLabel} and ${endLabel}`);
  else if (isStart) parts.push(startLabel);
  else if (isEnd) parts.push(endLabel);
  return parts.join(', ');
}
