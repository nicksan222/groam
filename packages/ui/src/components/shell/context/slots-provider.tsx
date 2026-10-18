'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import {
  type ShellSlotsApi,
  ShellSlotsContext,
  type SlotKind,
  type SlotMap
} from '#src/components/shell/context/slots-context';

const INITIAL_SLOTS: SlotMap = {
  sideTab: { el: null, consumers: 0 },
  sidebarTab: { el: null, consumers: 0 },
  content: { el: null, consumers: 0 }
};

export function ShellSlotsProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<SlotMap>(INITIAL_SLOTS);

  const setSlotEl = useCallback((kind: SlotKind, el: HTMLElement | null) => {
    setSlots((previous) =>
      el === null || previous[kind].el === el
        ? previous
        : { ...previous, [kind]: { ...previous[kind], el } }
    );
  }, []);

  const addConsumer = useCallback((kind: SlotKind) => {
    setSlots((previous) => ({
      ...previous,
      [kind]: { ...previous[kind], consumers: previous[kind].consumers + 1 }
    }));
  }, []);

  const removeConsumer = useCallback((kind: SlotKind) => {
    setSlots((previous) => ({
      ...previous,
      [kind]: { ...previous[kind], consumers: Math.max(0, previous[kind].consumers - 1) }
    }));
  }, []);

  const value = useMemo<ShellSlotsApi>(
    () => ({ slots, setSlotEl, addConsumer, removeConsumer }),
    [slots, setSlotEl, addConsumer, removeConsumer]
  );

  return <ShellSlotsContext.Provider value={value}>{children}</ShellSlotsContext.Provider>;
}
