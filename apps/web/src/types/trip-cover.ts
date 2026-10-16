import type { TripDetail } from '@/features/trips/hooks/use-trips';

export type TripCover = {
  canRefresh: boolean;
  isBusy: boolean;
  onImageError: () => void;
  refresh: () => void;
  refreshLabel: string;
  showPending: boolean;
  src: string | null;
};

export type TripCoverSource = Pick<
  TripDetail,
  'coverAttribution' | 'coverStatus' | 'coverUrl' | 'permissions'
>;
