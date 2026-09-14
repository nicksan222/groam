import { createContext, use } from 'react';

export type SlotKind = 'sideTab' | 'sidebarTab' | 'content';

export interface SlotInfo {
  el: HTMLElement | null;
  consumers: number;
}

export type SlotMap = Record<SlotKind, SlotInfo>;

export interface ShellSlotsApi {
  slots: SlotMap;
  setSlotEl: (kind: SlotKind, el: HTMLElement | null) => void;
  addConsumer: (kind: SlotKind) => void;
  removeConsumer: (kind: SlotKind) => void;
}

export const ShellSlotsContext = createContext<ShellSlotsApi | null>(null);

export function useShellSlots(): ShellSlotsApi | null {
  return use(ShellSlotsContext);
}
