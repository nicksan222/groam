import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import {
  AssistantAttachmentChips,
  AssistantAttachmentPicker,
  type AssistantAttachments
} from './assistant-attachments';

afterEach(cleanup);

const attachmentOption = {
  description: 'Portugal · Lisbon',
  id: 'activity-1',
  kind: 'activity' as const,
  label: 'Alfama walk',
  tripId: 'trip-1'
};

function attachmentFixture(onChange = vi.fn()): AssistantAttachments {
  return {
    catalog: [attachmentOption],
    disabled: false,
    onChange,
    tags: [{ id: 'trip-1', kind: 'trip', label: 'Portugal', tripId: 'trip-1' }]
  };
}

test('attaches and removes trip context from the composer', async () => {
  const onChange = vi.fn();
  const attachments = attachmentFixture(onChange);

  render(
    <>
      <AssistantAttachmentChips attachments={attachments} />
      <AssistantAttachmentPicker attachments={attachments} />
    </>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Remove Portugal attachment' }));
  expect(onChange).toHaveBeenCalledWith(attachments.tags[0], false);

  const trigger = screen.getByRole('button', { name: 'Attach trip context' });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  fireEvent.click(
    await waitFor(() => screen.getByRole('menuitemcheckbox', { name: /Alfama walk/u }))
  );
  expect(onChange).toHaveBeenCalledWith({ id: 'activity-1', kind: 'activity' }, true);
});

test('searches attachments and closes with Escape', async () => {
  render(<AssistantAttachmentPicker attachments={attachmentFixture()} />);

  const trigger = screen.getByRole('button', { name: 'Attach trip context' });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  const searchInput = await waitFor(() =>
    screen.getByRole('searchbox', { name: 'Search trip context' })
  );
  fireEvent.change(searchInput, { target: { value: 'missing' } });
  expect(screen.getByText('No matching trip context.')).toBeDefined();
  fireEvent.keyDown(searchInput, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByText('No matching trip context.')).toBeNull());
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});
