import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ApplyIdeaDialog } from './apply-idea-dialog';

afterEach(cleanup);

test('explains and confirms the shared-plan update', async () => {
  const onApply = vi.fn().mockResolvedValue(true);
  const onOpenChange = vi.fn();
  render(<ApplyIdeaDialog onApply={onApply} onOpenChange={onOpenChange} open pending={false} />);

  expect(screen.getByText(/Everyone will see the updated trip/u)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Apply to shared trip' }));
  await vi.waitFor(() => expect(onApply).toHaveBeenCalledOnce());
  await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
});

test('locks every exit while the idea is applying', () => {
  render(<ApplyIdeaDialog onApply={vi.fn()} onOpenChange={vi.fn()} open pending />);
  expect(screen.getByRole('alertdialog').getAttribute('aria-busy')).toBe('true');
  expect(screen.getByRole('button', { name: 'Keep reviewing' })).toHaveProperty('disabled', true);
  expect(screen.getByTestId('apply-idea-confirm')).toHaveProperty('disabled', true);
});
