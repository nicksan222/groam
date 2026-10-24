import { useEffect } from 'react';
import {
  currentTripPreference,
  isRememberableTrip
} from '@/features/trips/current-trip-preference';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import type { TripDetail } from '@/types/trips';

/** Keyed by user and group so switching either never carries a trip across. */
export function useCurrentTripPreferenceKey() {
  const { activeOrganization, session } = useWorkspace();
  return `groam:current-trip:${session.user.id}:${activeOrganization.id}`;
}

/**
 * Remembers the shared trip on screen as this group's current trip on this device. Working copies
 * and trips the viewer cannot plan in are never remembered. Mounted by the trip page, so phones,
 * where the sidebar is closed, remember trips too.
 */
export function useRememberTrip(
  trip: Pick<TripDetail, 'canParticipate' | 'proposal' | 'shortId'> | undefined
) {
  const key = useCurrentTripPreferenceKey();
  const shortId = isRememberableTrip(trip) ? trip?.shortId : undefined;
  useEffect(() => {
    const preference = currentTripPreference(key);
    if (shortId && preference.read() !== shortId) preference.write(shortId);
  }, [key, shortId]);
}
