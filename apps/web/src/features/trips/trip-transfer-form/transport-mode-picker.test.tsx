import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { stubMatchMedia } from '@/testing/stub-match-media';
import { TransportModePicker } from './transport-mode-picker';

afterEach(cleanup);

test('uses one clear transport selector without duplicate mode buttons', () => {
  stubMatchMedia();
  const onChange = vi.fn();
  render(<TransportModePicker disabled={false} mode="train" onChange={onChange} />);
  expect(screen.getByRole('combobox', { name: 'Transport mode' }).textContent).toContain('Train');
  expect(screen.queryByRole('button', { name: 'Flight' })).toBeNull();
});
