import { render } from '@groam/vitest-config/react';
import { Sparkles } from 'lucide-react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SuggestRow } from './suggest-row';

test('renders a suggestion row and reports selection', async () => {
  const onSelect = vi.fn();

  await render(
    <SuggestRow
      description="Ask Groam — reply visible to everyone"
      icon={<Sparkles />}
      onSelect={onSelect}
      title="@groam"
    />
  );

  await expect.element(page.getByText('@groam')).toBeInTheDocument();
  await page.getByRole('button', { name: /@groam/ }).click();
  expect(onSelect).toHaveBeenCalledTimes(1);
});
