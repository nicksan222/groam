import { useMediaQuery } from '@groam/ui/hooks/use-media-query';

const MOBILE_BREAKPOINT = 768;
/** Tailwind's `lg`: below it the trip header drops the trip's name and moves the going link into its facts line. */
const NARROW_BREAKPOINT = 1024;

/** Below Tailwind's `md`. */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

/** Below Tailwind's `lg`; use it to render one element instead of two hidden ones. */
export function useIsNarrow(): boolean {
  return useMediaQuery(`(max-width: ${NARROW_BREAKPOINT - 1}px)`);
}
