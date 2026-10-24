import { TRANSPORT_MODE_LABELS } from '@groam/backend/convex/modules/travel/transfers/labels';
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
} from '@groam/icons';
import type { TransferView } from '@/types/trips';
import type { TransportMode } from './hooks/use-trips';

export type { TransferView };

export const transportModes = [
  { icon: Footprints, label: TRANSPORT_MODE_LABELS.walk, mode: 'walk' },
  { icon: Bike, label: TRANSPORT_MODE_LABELS.bicycle, mode: 'bicycle' },
  { icon: Car, label: TRANSPORT_MODE_LABELS.car, mode: 'car' },
  { icon: Car, label: TRANSPORT_MODE_LABELS.rideshare, mode: 'rideshare' },
  { icon: Car, label: TRANSPORT_MODE_LABELS.taxi, mode: 'taxi' },
  { icon: TramFront, label: TRANSPORT_MODE_LABELS.public_transit, mode: 'public_transit' },
  { icon: Bus, label: TRANSPORT_MODE_LABELS.bus, mode: 'bus' },
  { icon: TrainFront, label: TRANSPORT_MODE_LABELS.train, mode: 'train' },
  { icon: Plane, label: TRANSPORT_MODE_LABELS.flight, mode: 'flight' },
  { icon: Ship, label: TRANSPORT_MODE_LABELS.ferry, mode: 'ferry' },
  { icon: Bus, label: TRANSPORT_MODE_LABELS.shuttle, mode: 'shuttle' },
  { icon: Route, label: TRANSPORT_MODE_LABELS.other, mode: 'other' }
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
