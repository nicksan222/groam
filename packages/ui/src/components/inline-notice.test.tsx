import { Archive } from '@groam/icons';
import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { InlineNotice } from './inline-notice';

test('renders an icon, title, and supporting copy', async () => {
  await render(
    <InlineNotice icon={Archive} title="This trip is archived and read-only.">
      Planning data and activity are preserved.
    </InlineNotice>
  );

  await expect.element(page.getByText('This trip is archived and read-only.')).toBeInTheDocument();
  await expect
    .element(page.getByText('Planning data and activity are preserved.'))
    .toBeInTheDocument();
});
