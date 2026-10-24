/** How each way of travelling reads to people. The one table behind every transfer name. */
export const TRANSPORT_MODE_LABELS = {
  bicycle: 'Bicycle',
  bus: 'Bus',
  car: 'Car',
  ferry: 'Ferry',
  flight: 'Flight',
  other: 'Other',
  public_transit: 'Public transit',
  rideshare: 'Rideshare',
  shuttle: 'Shuttle',
  taxi: 'Taxi',
  train: 'Train',
  walk: 'Walk'
} as const;

export type TransportModeKey = keyof typeof TRANSPORT_MODE_LABELS;

/**
 * The one name of a transfer: its mode and the two ends it joins, for example
 * "Train · Lisbon → Porto". The itinerary cards and an issue's "about" line both use it.
 */
export function transferLabel(mode: TransportModeKey, from: string, to: string): string {
  return `${TRANSPORT_MODE_LABELS[mode]} · ${from} → ${to}`;
}

/** The ends of the journey to and from the trip: it starts at "Arrival" and ends at "Departure". */
export function boundaryEnds(
  boundary: 'arrival' | 'departure',
  firstStop: string,
  lastStop: string
): { from: string; to: string } {
  return boundary === 'arrival'
    ? { from: 'Arrival', to: firstStop }
    : { from: lastStop, to: 'Departure' };
}
