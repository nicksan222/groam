import type { Id } from '@groam/backend/data-model';
import { create } from 'zustand';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { SIDEBAR_NESTED_PAGE_SIZE } from '@/features/workspace/workspace-sidebar/sidebar-nested-nav';
import type { SidebarSectionKey } from '@/types/workspace';

export type { SidebarSectionKey };

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type SectionRecord<T> = Record<SidebarSectionKey, T>;

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type SidebarChromeStore = {
  clearTripsArchive: () => void;
  closeTripsCreate: () => void;
  closeNestedCreate: (section: SidebarSectionKey) => void;
  isNestedCreateOpen: (section: SidebarSectionKey) => boolean;
  isSectionOpen: (section: SidebarSectionKey) => boolean;
  isTripsArchiveOpen: boolean;
  isTripsCreateOpen: boolean;
  menuTripId: Id<'trips'> | null;
  nestedCreateOpen: SectionRecord<boolean>;
  nestedVisible: SectionRecord<number>;
  nestedVisibleCount: (section: SidebarSectionKey) => number;
  onTripsArchiveOpenChange: (open: boolean) => void;
  onTripsMenuOpenChange: (tripId: Id<'trips'>, open: boolean) => void;
  openNestedCreate: (section: SidebarSectionKey) => void;
  openTripsCreate: () => void;
  requestTripsArchive: (trip: TripListItem) => void;
  sectionOpen: SectionRecord<boolean>;
  setNestedCreateOpen: (section: SidebarSectionKey, open: boolean) => void;
  setNestedVisibleCount: (section: SidebarSectionKey, count: number) => void;
  setSectionOpen: (section: SidebarSectionKey, open: boolean) => void;
  showMoreNested: (section: SidebarSectionKey, step?: number) => void;
  syncSectionActive: (section: SidebarSectionKey, sectionActive: boolean) => void;
  tripToArchive: TripListItem | null;
};

const defaultVisible = (): SectionRecord<number> => ({
  chat: SIDEBAR_NESTED_PAGE_SIZE,
  ideas: SIDEBAR_NESTED_PAGE_SIZE,
  issues: SIDEBAR_NESTED_PAGE_SIZE,
  trips: SIDEBAR_NESTED_PAGE_SIZE
});

const defaultSections = <T>(value: T): SectionRecord<T> => ({
  chat: value,
  ideas: value,
  issues: value,
  trips: value
});

const sidebarChromeData = {
  isTripsArchiveOpen: false,
  isTripsCreateOpen: false,
  menuTripId: null as Id<'trips'> | null,
  nestedCreateOpen: defaultSections(false),
  nestedVisible: defaultVisible(),
  sectionOpen: defaultSections(false),
  tripToArchive: null as TripListItem | null
};

/** Reset sidebar chrome between tests — global store is shared across files. */
export function resetSidebarChromeStore() {
  useSidebarChromeStore.setState(sidebarChromeData);
}

/** Sidebar chrome shared across workspace nav sections. Convex data stays in hooks. */
export const useSidebarChromeStore = create<SidebarChromeStore>((set, get) => ({
  ...sidebarChromeData,
  clearTripsArchive: () => set({ isTripsArchiveOpen: false, tripToArchive: null }),
  closeTripsCreate: () => set({ isTripsCreateOpen: false }),
  closeNestedCreate: (section) =>
    set((state) => ({
      nestedCreateOpen: { ...state.nestedCreateOpen, [section]: false }
    })),
  isNestedCreateOpen: (section) => get().nestedCreateOpen[section],
  isSectionOpen: (section) => get().sectionOpen[section],
  nestedVisibleCount: (section) => get().nestedVisible[section],
  onTripsArchiveOpenChange: (open) => {
    if (!open) get().clearTripsArchive();
  },
  onTripsMenuOpenChange: (tripId, open) => set({ menuTripId: open ? tripId : null }),
  openNestedCreate: (section) =>
    set((state) => ({
      nestedCreateOpen: { ...state.nestedCreateOpen, [section]: true }
    })),
  openTripsCreate: () => set({ isTripsCreateOpen: true }),
  requestTripsArchive: (trip) => set({ isTripsArchiveOpen: true, tripToArchive: trip }),
  setNestedCreateOpen: (section, open) =>
    set((state) => ({
      nestedCreateOpen: { ...state.nestedCreateOpen, [section]: open }
    })),
  setNestedVisibleCount: (section, count) =>
    set((state) => ({
      nestedVisible: { ...state.nestedVisible, [section]: count }
    })),
  setSectionOpen: (section, open) =>
    set((state) => {
      if (state.sectionOpen[section] === open) {
        return state;
      }
      return {
        sectionOpen: { ...state.sectionOpen, [section]: open }
      };
    }),
  showMoreNested: (section, step = SIDEBAR_NESTED_PAGE_SIZE) =>
    set((state) => ({
      nestedVisible: {
        ...state.nestedVisible,
        [section]: state.nestedVisible[section] + step
      }
    })),
  syncSectionActive: (section, sectionActive) => {
    if (sectionActive && !get().sectionOpen[section]) {
      get().setSectionOpen(section, true);
    }
  }
}));
