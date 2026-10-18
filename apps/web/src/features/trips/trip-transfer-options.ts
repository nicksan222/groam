import {
  Bike,
  Bus,
  Car,
  Footprints,
  Plane,
  Route,
  Ship,
  TrainFront,
  TramFront
} from 'lucide-react';
import type { TransferView } from '@/types/trips';
import type { TransportMode } from './hooks/use-trips';

export type { TransferView };

export const transportModes = [
  { icon: Footprints, label: 'Walk', mode: 'walk' },
  { icon: Bike, label: 'Bicycle', mode: 'bicycle' },
  { icon: Car, label: 'Car', mode: 'car' },
  { icon: Car, label: 'Rideshare', mode: 'rideshare' },
  { icon: Car, label: 'Taxi', mode: 'taxi' },
  { icon: TramFront, label: 'Public transit', mode: 'public_transit' },
  { icon: Bus, label: 'Bus', mode: 'bus' },
  { icon: TrainFront, label: 'Train', mode: 'train' },
  { icon: Plane, label: 'Flight', mode: 'flight' },
  { icon: Ship, label: 'Ferry', mode: 'ferry' },
  { icon: Bus, label: 'Shuttle', mode: 'shuttle' },
  { icon: Route, label: 'Other', mode: 'other' }
] as const satisfies ReadonlyArray<{
  icon: typeof Route;
  label: string;
  mode: TransportMode;
}>;

export function transportModeFor(mode: TransportMode) {
  const option = transportModes.find((item) => item.mode === mode);
  if (!option) throw new Error(`Unknown transport mode: ${mode}`);
  return option;
}

export function formatTransferDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining === 0 ? `${hours} hr` : `${hours} hr ${remaining} min`;
}
