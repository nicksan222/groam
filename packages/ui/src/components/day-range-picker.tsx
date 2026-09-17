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
        if (
          day == null ||
          isDayBlocked({ day, endDay, maximumDay, minimumDay, startDay, takenDays })
        ) {
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
        if (isDayBlocked({ day, endDay, maximumDay, minimumDay, startDay, takenDays })) return;
        skipClickRef.current = true;
        setAnchorDay(null);
        const [nextStart, nextEnd] = orderedRange(originRef.current, day);
        onChange(nextStart, nextEnd);
      }}
      onPointerUp={endPointer}
    >
      {days.map((day) => (
        <DayCell
          anchorDay={anchorDay}
          day={day}
          disabled={disabled}
          endDay={endDay}
          endLabel={endLabel}
          key={day}
          maximumDay={maximumDay}
          minimumDay={minimumDay}
          onChange={onChange}
          setAnchorDay={setAnchorDay}
          skipClickRef={skipClickRef}
          startDate={startDate}
          startDay={startDay}
          startLabel={startLabel}
          takenDays={takenDays}
        />
      ))}
    </div>
  );
}

function isDayBlocked({
  day,
  endDay,
  maximumDay,
  minimumDay,
  startDay,
  takenDays
}: {
  day: number;
  endDay: number | undefined;
  maximumDay: number;
  minimumDay: number;
  startDay: number | undefined;
  takenDays: ReadonlySet<number> | undefined;
}) {
  if (day < minimumDay || day > maximumDay) return true;
  const inRange =
    startDay !== undefined && endDay !== undefined && day >= startDay && day <= endDay;
  const isPendingStart = endDay === undefined && startDay !== undefined && day === startDay;
  if (takenDays?.has(day) && !inRange && !isPendingStart) return true;
  return false;
}

type DayCellProps = {
  anchorDay: number | null;
  day: number;
  disabled: boolean;
  endDay: number | undefined;
  endLabel: string;
  maximumDay: number;
  minimumDay: number;
  onChange: (startDay: number | undefined, endDay: number | undefined) => void;
  setAnchorDay: (day: number | null) => void;
  skipClickRef: { current: boolean };
  startDate?: null | string;
  startDay: number | undefined;
  startLabel: string;
  takenDays?: ReadonlySet<number>;
};

function DayCell(props: DayCellProps) {
  const { day, endDay, maximumDay, minimumDay, startDay, takenDays } = props;
  const selection = daySelectionState(day, startDay, endDay);
  const availability = dayAvailabilityState({
    day,
    endDay,
    maximumDay,
    minimumDay,
    startDay,
    takenDays
  });
  const date = props.startDate ? dayOfMonthForDay(props.startDate, day) : null;
  return (
    <button
      aria-label={dayCellLabel({
        date: props.startDate ? dateForDay(props.startDate, day) : null,
        day,
        endLabel: props.endLabel,
        isEnd: selection.isEnd,
        isStart: selection.isStart || selection.isPendingStart,
        isTaken: availability.isTaken,
        startLabel: props.startLabel
      })}
      aria-pressed={selection.inRange || selection.isPendingStart}
      className={dayCellClassName(selection, availability, day === props.anchorDay)}
      data-day={day}
      data-taken={availability.isTaken ? '' : undefined}
      disabled={props.disabled || availability.isBlocked}
      onClick={() => selectDay(props, availability.isBlocked)}
      type="button"
    >
      <span className="text-sm font-semibold tabular-nums leading-none">{day}</span>
      {date && (
        <span className={dateClassName(selection.inRange, selection.isPendingStart)}>{date}</span>
      )}
    </button>
  );
}

function daySelectionState(day: number, startDay: number | undefined, endDay: number | undefined) {
  const inRange =
    startDay !== undefined && endDay !== undefined && day >= startDay && day <= endDay;
  return {
    inRange,
    isEnd: endDay !== undefined && day === endDay,
    isPendingStart: endDay === undefined && startDay !== undefined && day === startDay,
    isStart: startDay !== undefined && day === startDay
  };
}

function dayAvailabilityState({
  day,
  endDay,
  maximumDay,
  minimumDay,
  startDay,
  takenDays
}: {
  day: number;
  endDay: number | undefined;
  maximumDay: number;
  minimumDay: number;
  startDay: number | undefined;
  takenDays?: ReadonlySet<number>;
}) {
  const selection = daySelectionState(day, startDay, endDay);
  const isTaken = Boolean(takenDays?.has(day) && !selection.inRange && !selection.isPendingStart);
  return {
    isBlocked: isDayBlocked({ day, endDay, maximumDay, minimumDay, startDay, takenDays }),
    isOutOfBounds: day < minimumDay || day > maximumDay,
    isTaken
  };
}

function dayCellClassName(
  selection: ReturnType<typeof daySelectionState>,
  availability: ReturnType<typeof dayAvailabilityState>,
  isAnchor: boolean
) {
  return cn(
    'flex min-h-12 flex-col items-center justify-center rounded-lg border border-border bg-background px-1 py-1.5 text-center shadow-xs transition-colors',
    'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    selectedDayClassName(selection),
    availableDayClassName(selection, availability),
    stayCellRadius({
      inRange: selection.inRange || selection.isPendingStart,
      isEnd: selection.isEnd,
      isStart: selection.isStart || selection.isPendingStart
    }),
    isAnchor && 'z-10 ring-2 ring-ring ring-offset-2 ring-offset-background'
  );
}

function selectedDayClassName({ inRange, isPendingStart }: ReturnType<typeof daySelectionState>) {
  if (inRange) return 'bg-primary text-primary-foreground';
  return isPendingStart
    ? 'bg-primary/15 text-foreground ring-1 ring-inset ring-primary/40'
    : undefined;
}

function availableDayClassName(
  { inRange, isPendingStart }: ReturnType<typeof daySelectionState>,
  { isOutOfBounds, isTaken }: ReturnType<typeof dayAvailabilityState>
) {
  if (isTaken) {
    return 'cursor-not-allowed bg-muted/60 text-muted-foreground line-through decoration-muted-foreground/70';
  }
  if (isOutOfBounds) return 'cursor-not-allowed text-muted-foreground/45';
  if (!inRange && !isPendingStart) {
    return 'text-muted-foreground hover:border-primary/50 hover:text-foreground hover:shadow-sm';
  }
  return undefined;
}

function selectDay(props: DayCellProps, isBlocked: boolean) {
  if (props.skipClickRef.current) {
    props.skipClickRef.current = false;
    return;
  }
  if (isBlocked) return;
  const next = nextDaySelection(props.day, props.anchorDay, props.startDay, props.endDay);
  props.onChange(next.startDay, next.endDay);
  props.setAnchorDay(next.anchorDay);
}

function nextDaySelection(
  day: number,
  anchorDay: number | null,
  startDay: number | undefined,
  endDay: number | undefined
) {
  if (startDay !== undefined && endDay !== undefined) {
    return startDay === day && endDay === day
      ? { anchorDay: null, endDay: undefined, startDay: undefined }
      : { anchorDay: day, endDay: undefined, startDay: day };
  }
  const anchor = anchorDay ?? startDay;
  if (anchor == null || anchor === day) {
    return anchor == null
      ? { anchorDay: day, endDay: undefined, startDay: day }
      : { anchorDay: null, endDay: undefined, startDay: undefined };
  }
  const [nextStart, nextEnd] = orderedRange(anchor, day);
  return { anchorDay: null, endDay: nextEnd, startDay: nextStart };
}

function dateClassName(inRange: boolean, isPendingStart: boolean) {
  return cn(
    'mt-1 text-[10px] tabular-nums leading-none',
    inRange
      ? 'text-primary-foreground/80'
      : isPendingStart
        ? 'text-foreground/70'
        : 'text-muted-foreground'
  );
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
