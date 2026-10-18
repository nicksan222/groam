import { useSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';

export function useTripsSidebarUi() {
  const isCreateOpen = useSidebarChromeStore((state) => state.isTripsCreateOpen);
  const tripToArchive = useSidebarChromeStore((state) => state.tripToArchive);
  const menuTripId = useSidebarChromeStore((state) => state.menuTripId);
  const openTripsCreate = useSidebarChromeStore((state) => state.openTripsCreate);
  const closeTripsCreate = useSidebarChromeStore((state) => state.closeTripsCreate);
  const requestTripsArchive = useSidebarChromeStore((state) => state.requestTripsArchive);
  const clearTripsArchive = useSidebarChromeStore((state) => state.clearTripsArchive);
  const onTripsArchiveOpenChange = useSidebarChromeStore((state) => state.onTripsArchiveOpenChange);
  const onTripsMenuOpenChange = useSidebarChromeStore((state) => state.onTripsMenuOpenChange);

  return {
    clearArchive: clearTripsArchive,
    closeCreate: closeTripsCreate,
    isArchiveOpen: tripToArchive !== null,
    isCreateOpen,
    menuTripId,
    onArchiveOpenChange: onTripsArchiveOpenChange,
    onMenuOpenChange: onTripsMenuOpenChange,
    openCreate: openTripsCreate,
    requestArchive: requestTripsArchive,
    setCreateOpen: (open: boolean) => {
      if (open) openTripsCreate();
      else closeTripsCreate();
    },
    tripToArchive
  };
}
