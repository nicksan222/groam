import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { MessageComposer, type MessageComposerApi } from './message-composer';

test('submits and clears a composed message', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  await render(<MessageComposer label="Add comment" onSubmit={onSubmit} />);
  await page.getByRole('textbox', { name: 'Add comment' }).fill('  Looks good  ');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect.poll(() => onSubmit.mock.calls).toEqual([['Looks good']]);
  await expect.element(page.getByRole('textbox', { name: 'Add comment' })).toHaveTextContent('');
});

test('allows empty submit when attachments are pending', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  await render(<MessageComposer allowEmptySubmit label="Message" onSubmit={onSubmit} />);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect.poll(() => onSubmit.mock.calls).toEqual([['']]);
});

test('exposes composer api slots for inserts and attach', async () => {
  const onAttachFiles = vi.fn();
  const captured: { api: MessageComposerApi | null } = { api: null };
  const { container } = await render(
    <MessageComposer
      label="Message"
      onAttachFiles={onAttachFiles}
      onSubmit={vi.fn().mockResolvedValue(true)}
      toolbarStart={(composer) => {
        captured.api = composer;
        return (
          <button onClick={() => composer.insertText('@groam ')} type="button">
            Ask Groam
          </button>
        );
      }}
    />
  );
  await page.getByRole('button', { name: 'Ask Groam' }).click();
  await expect.element(page.getByRole('textbox', { name: 'Message' })).toHaveTextContent('@groam');
  expect(captured.api?.text).toContain('@groam');

  const picker = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!picker) throw new Error('The composer renders no file picker');
  await userEvent.upload(picker, new File(['plan'], 'plan.pdf'));
  expect(onAttachFiles).toHaveBeenCalledWith([expect.objectContaining({ name: 'plan.pdf' })]);
});
