import { createFileRoute } from '@tanstack/react-router';
import { TripListView } from '@/features/trips/trip-list/trip-list-view';

export const Route = createFileRoute('/_workspace/trips/')({ component: TripListView });
