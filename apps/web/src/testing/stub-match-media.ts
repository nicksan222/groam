import { vi } from 'vitest';

export function stubMatchMedia(matches = false) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn()
      }) as unknown as MediaQueryList
  );
}
