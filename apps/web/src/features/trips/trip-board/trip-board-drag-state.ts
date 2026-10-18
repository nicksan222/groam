import { createContext, useContext } from 'react';
import type { TripBoardDragState } from '@/types/trip-board';

export const idleDrag: TripBoardDragState = { item: null, target: null };

export const TripBoardDragContext = createContext<TripBoardDragState>(idleDrag);

export const useTripBoardDrag = () => useContext(TripBoardDragContext);
