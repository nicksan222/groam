import { vi } from 'vitest';

export function stubPopoverEnvironment() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    }
  );
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => undefined;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => undefined;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined;
  }
}
