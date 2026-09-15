import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Sparkles } from 'lucide-react';
import { afterEach, expect, test, vi } from 'vitest';
import { RemovableChip } from './removable-chip';

afterEach(cleanup);

test('renders a labeled chip and calls onRemove', () => {
  const onRemove = vi.fn();

  render(
    <RemovableChip
      icon={Sparkles}
      label="@groam"
      onRemove={onRemove}
      removeLabel="Remove @groam"
      title="Groam will reply in this chat"
    />
  );

  expect(screen.getByText('@groam')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Remove @groam' }));
  expect(onRemove).toHaveBeenCalledTimes(1);
});
