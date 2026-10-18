import type { ReactNode } from 'react';
import type { TripCover } from '@/types/trip-cover';

/** Everything the shared trip header needs; the shared trip and an idea's working copy both fill it. */
export type TripHeaderProps = {
  actions: ReactNode;
  chips: ReactNode;
  cover: TripCover;
  dataTripId?: string;
  dataTripName?: string;
  /** Small pill above the title, for example the idea's state. */
  status?: ReactNode;
  testId: string;
  title: string;
};
