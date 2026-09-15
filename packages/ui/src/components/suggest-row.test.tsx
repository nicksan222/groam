import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Sparkles } from 'lucide-react';
import { afterEach, expect, test, vi } from 'vitest';
import { SuggestRow } from './suggest-row';

afterEach(cleanup);

test('renders a suggestion row and reports selection', () => {
  const onSelect = vi.fn();

  render(
    <SuggestRow
      description="Ask Groam — reply visible to everyone"
      icon={<Sparkles />}
      onSelect={onSelect}
      title="@groam"
    />
  );

  expect(screen.getByText('@groam')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /@groam/ }));
  expect(onSelect).toHaveBeenCalledTimes(1);
});
