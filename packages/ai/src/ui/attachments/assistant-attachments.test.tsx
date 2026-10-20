import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import {
  AssistantAttachmentChips,
  AssistantAttachmentPicker,
  type AssistantAttachments
} from './assistant-attachments';

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

  await render(
    <>
      <AssistantAttachmentChips attachments={attachments} />
      <AssistantAttachmentPicker attachments={attachments} />
    </>
  );

  await page.getByRole('button', { name: 'Remove Portugal attachment' }).click();
  expect(onChange).toHaveBeenCalledWith(attachments.tags[0], false);

  const trigger = page.getByRole('button', { name: 'Attach trip context' }).element();
  trigger.focus();
  trigger.focus();
  await userEvent.keyboard('{ArrowDown}');
  await userEvent.click(
    await vi.waitFor(() => page.getByRole('menuitemcheckbox', { name: /Alfama walk/u }).element())
  );
  expect(onChange).toHaveBeenCalledWith({ id: 'activity-1', kind: 'activity' }, true);
});

test('searches attachments and closes with Escape', async () => {
  await render(<AssistantAttachmentPicker attachments={attachmentFixture()} />);

  const trigger = page.getByRole('button', { name: 'Attach trip context' }).element();
  trigger.focus();
  trigger.focus();
  await userEvent.keyboard('{ArrowDown}');
  const searchInput = await vi.waitFor(() =>
    page.getByRole('searchbox', { name: 'Search trip context' }).element()
  );
  await userEvent.fill(searchInput, 'missing');
  await expect.element(page.getByText('No matching trip context.')).toBeInTheDocument();
  searchInput.focus();
  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByText('No matching trip context.')).not.toBeInTheDocument();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});

test('offers explicit pagination even when a filtered catalog page has no accessible items', async () => {
  const loadMoreCatalog = vi.fn();
  await render(
    <AssistantAttachmentPicker
      attachments={{
        ...attachmentFixture(),
        catalog: [],
        canLoadMoreCatalog: true,
        loadMoreCatalog
      }}
    />
  );
  const trigger = page.getByRole('button', { name: 'Attach trip context' }).element();
  trigger.focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect
    .element(page.getByText('No accessible trip context on the loaded pages.'))
    .toBeInTheDocument();
  expect(loadMoreCatalog).not.toHaveBeenCalled();
  await page.getByRole('button', { name: 'Load more trip context' }).click();
  expect(loadMoreCatalog).toHaveBeenCalledTimes(1);
});

test('shows a disabled loading control while another catalog page is pending', async () => {
  await render(
    <AssistantAttachmentPicker
      attachments={{
        ...attachmentFixture(),
        catalog: [],
        isLoadingCatalog: true,
        loadMoreCatalog: vi.fn()
      }}
    />
  );
  const trigger = page.getByRole('button', { name: 'Attach trip context' }).element();
  trigger.focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(page.getByRole('button', { name: 'Loading more…' })).toBeDisabled();
  await expect.element(page.getByText('Loading trip context…')).toBeInTheDocument();
});

test('disables pagination if attachment editing becomes unavailable', async () => {
  const attachments = {
    ...attachmentFixture(),
    canLoadMoreCatalog: true,
    loadMoreCatalog: vi.fn()
  };
  const view = await render(<AssistantAttachmentPicker attachments={attachments} />);
  const trigger = page.getByRole('button', { name: 'Attach trip context' }).element();
  trigger.focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(page.getByRole('button', { name: 'Load more trip context' })).toBeEnabled();
  await view.rerender(
    <AssistantAttachmentPicker attachments={{ ...attachments, disabled: true }} />
  );
  await expect.element(page.getByRole('button', { name: 'Load more trip context' })).toBeDisabled();
  expect(attachments.loadMoreCatalog).not.toHaveBeenCalled();
});
