import { create } from 'zustand';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type CommandPaletteChrome = {
  closeAndClear: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  query: string;
  setQuery: (query: string) => void;
  toggle: () => void;
};

/** Command palette open/query chrome — Convex data stays in the hook. */
export const useCommandPaletteChrome = create<CommandPaletteChrome>((set) => ({
  closeAndClear: () => set({ open: false, query: '' }),
  onOpenChange: (open) => set(open ? { open } : { open: false, query: '' }),
  open: false,
  query: '',
  setQuery: (query) => set({ query }),
  toggle: () => set((state) => ({ open: !state.open }))
}));
