import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { VersionStatusIcon } from './version-status-icon';

describe('VersionStatusIcon', () => {
  test.each([
    ['draft', 'Draft', 'text-muted-foreground'],
    ['in_review', 'In review', 'text-muted-foreground'],
    ['merged', 'Applied', 'text-foreground'],
    ['closed', 'Closed', 'text-muted-foreground'],
    ['conflicted', 'Needs update', 'text-destructive']
  ] as const)('%s icon is labelled %s', async (status, label, tone) => {
    await render(<VersionStatusIcon status={status} />);
    const icon = page.getByRole('img', { name: label });
    await expect.element(icon).toBeVisible();
    await expect.element(icon).toHaveClass(tone);
  });
});
