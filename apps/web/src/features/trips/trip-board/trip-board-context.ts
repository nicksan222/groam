import { createContext, useContext } from 'react';
import type { TripBoardContextValue } from '@/types/trip-board';

export const TripBoardContext = createContext<TripBoardContextValue | null>(null);

export function useTripBoardContext() {
  const board = useContext(TripBoardContext);
  if (!board) throw new Error('Trip board components must be used inside TripBoard');
  return board;
}
