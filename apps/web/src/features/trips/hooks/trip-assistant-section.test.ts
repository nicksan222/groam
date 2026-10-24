import { expect, test } from 'vite-plus/test';
import { assistantSection } from './trip-assistant-section';

test.each(['plan', 'calendar', 'polls', 'research', 'packing', 'people'] as const)(
  'reads the %s tab as the overview for the assistant',
  (section) => {
    expect(assistantSection(section)).toBe('overview');
  }
);

test.each(['overview', 'itinerary', 'activity', 'ideas', 'issues'] as const)(
  'keeps the %s section the assistant knows',
  (section) => {
    expect(assistantSection(section)).toBe(section);
  }
);
