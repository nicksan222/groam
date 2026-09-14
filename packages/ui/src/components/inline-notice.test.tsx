import { cleanup, render, screen } from '@testing-library/react';
import { Archive } from 'lucide-react';
import { afterEach, expect, test } from 'vitest';
import { InlineNotice } from './inline-notice';

afterEach(cleanup);

test('renders an icon, title, and supporting copy', () => {
  render(
    <InlineNotice icon={Archive} title="This trip is archived and read-only.">
      Planning data and activity are preserved.
    </InlineNotice>
  );

  expect(screen.getByText('This trip is archived and read-only.')).toBeTruthy();
  expect(screen.getByText('Planning data and activity are preserved.')).toBeTruthy();
});
