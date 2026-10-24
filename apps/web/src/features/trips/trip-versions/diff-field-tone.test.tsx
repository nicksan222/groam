import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DiffFieldTone } from './diff-field-tone';

describe('DiffFieldTone', () => {
  test.each<['after' | 'before', boolean, string]>([
    ['before', true, 'text-muted-foreground/70'],
    ['after', true, 'text-muted-foreground'],
    ['before', false, 'text-muted-foreground'],
    ['after', false, 'font-medium']
  ])('side=%s empty=%s', async (side, empty, className) => {
    await render(
      <DiffFieldTone empty={empty} side={side}>
        value
      </DiffFieldTone>
    );
    const element = page.getByText('value');
    await expect.element(element).toBeVisible();
    await expect.element(element).toHaveClass(className);
  });
});
