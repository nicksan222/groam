import {
  clearDevicePreference,
  readDevicePreference,
  writeDevicePreference
} from '@/lib/device-preference';
import type { TripDetail } from '@/types/trips';

/** Whether a trip may be remembered as the group's current one: shared and open to the viewer. */
export function isRememberableTrip(
  trip: Pick<TripDetail, 'canParticipate' | 'proposal'> | null | undefined
): trip is Pick<TripDetail, 'canParticipate' | 'proposal'> {
  return Boolean(trip && !trip.proposal && trip.canParticipate);
}

const listeners = new Set<() => void>();

/** Calls `listener` whenever this tab remembers or forgets a trip, so the sidebar follows a page that sets it. */
export function subscribeCurrentTripPreference(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  for (const listener of listeners) listener();
}

/** The short id of the trip remembered under `key` (a user and group) on this device. */
export function currentTripPreference(key: string) {
  return {
    clear: () => {
      clearDevicePreference(key);
      notify();
    },
    read: () => readDevicePreference(key),
    write: (shortId: string) => {
      writeDevicePreference(key, shortId);
      notify();
    }
  };
}
