import { useState } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type ThreadMessageChromeStore = {
  chromeOpen: boolean;
  menuOpen: boolean;
  pickerOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  setPickerOpen: (open: boolean) => void;
};

function createThreadMessageChromeStore() {
  return createStore<ThreadMessageChromeStore>()((set) => ({
    chromeOpen: false,
    menuOpen: false,
    pickerOpen: false,
    setMenuOpen: (open) =>
      set((state) => ({
        chromeOpen: open || state.pickerOpen,
        menuOpen: open,
        pickerOpen: open ? false : state.pickerOpen
      })),
    setPickerOpen: (open) =>
      set((state) => ({
        chromeOpen: open || state.menuOpen,
        menuOpen: open ? false : state.menuOpen,
        pickerOpen: open
      }))
  }));
}

/** Keeps reaction picker and message menu mutually exclusive. */
export function useThreadMessageChromeState() {
  const [store] = useState(createThreadMessageChromeStore);
  return useStore(store);
}
