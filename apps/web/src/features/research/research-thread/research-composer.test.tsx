import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ResearchComposer } from './research-composer';

const onAsk = vi.fn<(input: { effort: string; topic: string }) => Promise<boolean>>();
const onSaveNote = vi.fn<(input: { text: string }) => Promise<boolean>>();

beforeEach(() => {
  vi.clearAllMocks();
  onAsk.mockResolvedValue(true);
  onSaveNote.mockResolvedValue(true);
});

const view = (props: Partial<Parameters<typeof ResearchComposer>[0]> = {}) =>
  render(
    <ResearchComposer
      busy={false}
      hasRun
      noteDisabled={false}
      onAsk={onAsk}
      onSaveNote={onSaveNote}
      topic="Hotels in Rome"
      {...props}
    />
  );

test('starts the first run on the topic with standard effort', async () => {
  await view({ hasRun: false });
  await expect
    .element(page.getByRole('button', { name: 'Ask the researcher' }))
    .toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Research this topic' }).click();
  expect(onAsk).toHaveBeenCalledWith({ effort: 'standard', topic: 'Hotels in Rome' });
});

test('scopes a follow-up to the topic and keeps it after a failed start', async () => {
  onAsk.mockResolvedValueOnce(false);
  await view();
  await page.getByRole('button', { name: 'Ask the researcher' }).click();
  await expect.element(page.getByRole('button', { name: 'Ask', exact: true })).toBeDisabled();
  const input = page.getByRole('textbox', { name: 'Follow-up for the researcher' });
  await input.fill('Check lift access');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  expect(onAsk).toHaveBeenCalledWith({
    effort: 'standard',
    topic: 'Hotels in Rome: Check lift access'
  });
  await expect.element(input).toHaveValue('Check lift access');
});

test('saves a note without starting research and clears it once saved', async () => {
  await view();
  const input = page.getByRole('textbox', { name: 'Research note' });
  await input.fill('https://example.com/rooms');
  await page.getByRole('button', { name: 'Add note' }).click();
  expect(onSaveNote).toHaveBeenCalledWith({ text: 'https://example.com/rooms' });
  expect(onAsk).not.toHaveBeenCalled();
  await expect.element(input).toHaveValue('');
});

test('prevents asking while research is running', async () => {
  await view({ busy: true });
  await page.getByRole('button', { name: 'Ask the researcher' }).click();
  await page.getByRole('textbox', { name: 'Follow-up for the researcher' }).fill('More');
  await expect.element(page.getByRole('button', { name: 'Research in progress…' })).toBeDisabled();
});
