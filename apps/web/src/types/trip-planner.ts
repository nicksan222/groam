import type { Destination, TransferView, TripActivity, TripDetail } from '@/types/trips';

export type PlannerPeriod = 'full_day' | 'morning' | 'afternoon' | 'evening';
export type PlannerEntry = {
  key: string;
  title: string;
  location: string;
  startDay: number | null;
  endDay: number | null;
  startTime: string | null;
  endTime: string | null;
  period: PlannerPeriod;
} & (
  | { kind: 'activity'; activity: TripActivity }
  | { kind: 'travel'; transfer: TransferView }
  | { kind: 'stay'; stay: Destination['stays'][number] }
);
export type PlannerDay = {
  day: number;
  destinations: Destination[];
  entries: PlannerEntry[];
  stays: Array<{ destination: Destination; stay: Destination['stays'][number] }>;
};
export type TripPlanner = {
  days: PlannerDay[];
  unscheduledDestinations: Destination[];
  unscheduledTravel: PlannerEntry[];
};
export type PlannerTrip = Pick<
  TripDetail,
  'destinations' | 'totalDurationDays' | 'arrivalTransfer' | 'departureTransfer'
>;

/** The shared day card surface; the read-only planner and the idea editor both fill it. */
export type PlannerDayFrameProps = {
  ariaLabel: string;
  children: import('react').ReactNode;
  date: string | null;
  day: number;
  photo?: { name: string; src: string | null };
  subtitle: import('react').ReactNode;
};
