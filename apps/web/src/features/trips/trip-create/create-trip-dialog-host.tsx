import { useTrips } from '@/features/trips/hooks/use-trips';
import { CreateTripDialog } from '@/features/trips/trip-create/create-trip-dialog';
import { defaultTripSection } from '@/features/trips/trip-sections';
import { useNavigate } from '@/lib/navigation/router';

/** The workspace's Create trip dialog; opens the new trip's Plan when it is created. */
export function CreateTripDialogHost({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { createTrip } = useTrips('skip');
  return (
    <CreateTripDialog
      createTrip={createTrip}
      onClose={onClose}
      onCreated={(tripId) => {
        onClose();
        void navigate({
          params: { section: defaultTripSection, tripId },
          to: '/trips/$tripId/$section'
        });
      }}
    />
  );
}
