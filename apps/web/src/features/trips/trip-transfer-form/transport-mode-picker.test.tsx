import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TransportModePicker } from './transport-mode-picker';

test('uses one clear transport selector without duplicate mode buttons', async () => {
  const onChange = vi.fn();
  await render(<TransportModePicker disabled={false} mode="train" onChange={onChange} />);
  expect(page.getByRole('combobox', { name: 'Transport mode' }).element().textContent).toContain(
    'Train'
  );
  await expect.element(page.getByRole('button', { name: 'Flight' })).not.toBeInTheDocument();
});
