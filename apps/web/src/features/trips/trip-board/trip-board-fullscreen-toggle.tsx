import { Button } from '@groam/ui/components/button';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useTripBoardFullscreen } from '@/features/trips/hooks/use-trip-board-fullscreen';
import { testIds } from '@/lib/test-ids';

/**
 * Puts the board in browser fullscreen, or takes it out again. It sits with the header actions at
 * the menu button's size, hidden on phones and where the browser has no fullscreen.
 */
export function TripBoardFullscreenToggle() {
  const { active, supported, toggle } = useTripBoardFullscreen();
  if (!supported) return null;
  return (
    <Button
      aria-label="Full screen"
      aria-pressed={active}
      className="hidden touch-manipulation sm:inline-flex"
      data-testid={testIds.tripBoardFullscreen}
      onClick={toggle}
      size="icon"
      type="button"
      variant="ghost"
    >
      {active ? <Minimize2 /> : <Maximize2 />}
    </Button>
  );
}
