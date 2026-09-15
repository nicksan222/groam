import { useState } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type PanelStore = {
  closePanel: () => void;
  open: boolean;
  openPanel: () => void;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

function createPanelStore(initialOpen = false) {
  return createStore<PanelStore>()((set) => ({
    closePanel: () => set({ open: false }),
    open: initialOpen,
    openPanel: () => set({ open: true }),
    setOpen: (open) => set({ open }),
    toggle: () => set((state) => ({ open: !state.open }))
  }));
}

/** One open/closed panel per component mount. */
export function usePanelState(initialOpen = false) {
  const [store] = useState(() => createPanelStore(initialOpen));
  return useStore(store);
}
