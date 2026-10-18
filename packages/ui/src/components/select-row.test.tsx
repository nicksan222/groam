import { render } from '@groam/vitest-config/react';
import { MapPin } from 'lucide-react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SelectRow } from './select-row';

test('renders a selectable row and reports selection', async () => {
  const onSelect = vi.fn();

  await render(
    <SelectRow
      icon={<MapPin />}
      onSelect={onSelect}
      selected
      subtitle="City · Portugal"
      title="Lisbon"
    />
  );

  await expect.element(page.getByText('Lisbon')).toBeInTheDocument();
  await expect.element(page.getByText('City · Portugal')).toBeInTheDocument();
  await page.getByRole('button', { name: /Lisbon/ }).click();
  expect(onSelect).toHaveBeenCalledTimes(1);
});
