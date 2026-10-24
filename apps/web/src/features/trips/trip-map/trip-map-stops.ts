import { TRANSPORT_MODE_LABELS } from '@groam/backend/convex/modules/travel/transfers/labels';
import type { Destination, MapStop } from '@/types/trips';

/** How many day hues the chart tokens give; days past it reuse them in order. */
export const dayHueCount = 5;

/** The CSS variable a day is drawn in, or the muted one for a stop with no day yet. */
export function dayHueVariable(day: number | null): string {
  return day === null ? '--muted-foreground' : `--chart-${((day - 1) % dayHueCount) + 1}`;
}

export function dayHue(day: number | null): string {
  return `var(${dayHueVariable(day)})`;
}

/** The days a trip spans: the planned length, or as far as any stop reaches. */
export function mapDayCount(totalDurationDays: number | null, destinations: Destination[]): number {
  const reach = Math.max(0, ...destinations.map(({ endDay }) => endDay ?? 0));
  return Math.max(totalDurationDays ?? 0, reach);
}

/** The route's stops in order, each numbered across the whole trip. */
export function mapStops(destinations: Destination[]): MapStop[] {
  return destinations.map((destination, index) => ({
    colorDay: destination.startDay,
    destination,
    number: index + 1
  }));
}

/** Every stop, or only those the trip is at on `day`. A selected day tints its stops in its own hue. */
export function stopsOnDay(stops: MapStop[], day: number | null): MapStop[] {
  if (day === null) return stops;
  return stops
    .filter(({ destination: { endDay, startDay } }) =>
      startDay === null || endDay === null ? false : startDay <= day && day <= endDay
    )
    .map((stop) => ({ ...stop, colorDay: day }));
}

export function stopDaysLabel({ endDay, startDay }: Pick<Destination, 'endDay' | 'startDay'>) {
  if (startDay === null || endDay === null) return 'Days to be decided';
  return startDay === endDay ? `Day ${startDay}` : `Days ${startDay}–${endDay}`;
}

/** "Train · 2 h 30 min" for the leg out of a stop, or null when it has none. */
export function legLabel(transfer: Destination['transferToNext']): string | null {
  if (!transfer) return null;
  const mode = TRANSPORT_MODE_LABELS[transfer.mode];
  const minutes = transfer.durationMinutes;
  if (minutes === null) return mode;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const time = [hours > 0 ? `${hours} h` : '', rest > 0 || hours === 0 ? `${rest} min` : '']
    .filter(Boolean)
    .join(' ');
  return `${mode} · ${time}`;
}

/** The line segments between neighbouring visible stops, each in the hue of the stop it leaves. */
export function mapLegs(stops: MapStop[]) {
  return stops.slice(1).map((stop, index) => {
    const from = stops[index] as MapStop;
    return {
      colorDay: from.colorDay,
      id: `${from.destination.id}:${stop.destination.id}`,
      line: [
        [from.destination.longitude, from.destination.latitude],
        [stop.destination.longitude, stop.destination.latitude]
      ] as [[number, number], [number, number]]
    };
  });
}
