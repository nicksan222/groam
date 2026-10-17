import { render } from '@groam/vitest-config/react';
import { useState } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { RichTextEditor } from './rich-text-editor';

function Harness({
  initial = '',
  onChange = vi.fn(),
  onSubmit,
  submitShortcut,
  toolbar
}: {
  initial?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  submitShortcut?: 'enter' | 'mod-enter';
  toolbar?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <RichTextEditor
      aria-label="Note"
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      onSubmit={onSubmit}
      placeholder="Write a note"
      submitShortcut={submitShortcut}
      toolbar={toolbar}
      value={value}
    />
  );
}

test('exposes a labelled multiline textbox', async () => {
  await render(<Harness />);
  const box = page.getByRole('textbox', { name: 'Note' });
  await expect.element(box).toHaveAttribute('aria-multiline', 'true');
});

test('loads Markdown and reports edits as Markdown', async () => {
  const onChange = vi.fn();
  await render(<Harness initial="**Rome** first" onChange={onChange} />);
  await expect.element(page.getByText('Rome')).toBeVisible();
  expect(page.getByText('Rome').element().tagName).toBe('STRONG');
  await page.getByRole('textbox', { name: 'Note' }).click();
  await userEvent.keyboard('{End} then Pisa');
  await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith('**Rome** first then Pisa'));
});

test('turns Markdown shortcuts into formatting', async () => {
  const onChange = vi.fn();
  await render(<Harness onChange={onChange} />);
  await page.getByRole('textbox', { name: 'Note' }).click();
  await userEvent.keyboard('- Quiet');
  await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith('- Quiet'));
  expect(page.getByRole('listitem').elements()).toHaveLength(1);
});

test('formats from the toolbar', async () => {
  const onChange = vi.fn();
  await render(<Harness onChange={onChange} toolbar />);
  await page.getByRole('textbox', { name: 'Note' }).click();
  await page.getByRole('button', { name: 'Bold' }).click();
  await userEvent.keyboard('Big');
  await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith('**Big**'));
});

test('submits on Enter when asked, keeping Shift+Enter for new lines', async () => {
  const onSubmit = vi.fn();
  await render(<Harness onSubmit={onSubmit} submitShortcut="enter" />);
  await page.getByRole('textbox', { name: 'Note' }).click();
  await userEvent.keyboard('Hi{Shift>}{Enter}{/Shift}there');
  expect(onSubmit).not.toHaveBeenCalled();
  await userEvent.keyboard('{Enter}');
  expect(onSubmit).toHaveBeenCalledOnce();
});

test('submits on Mod+Enter by default', async () => {
  const onSubmit = vi.fn();
  await render(<Harness onSubmit={onSubmit} />);
  await page.getByRole('textbox', { name: 'Note' }).click();
  await userEvent.keyboard('Hi{Enter}');
  expect(onSubmit).not.toHaveBeenCalled();
  await userEvent.keyboard('{Control>}{Enter}{/Control}');
  expect(onSubmit).toHaveBeenCalledOnce();
});

test('follows outside value changes', async () => {
  function Clearable() {
    const [value, setValue] = useState('Draft');
    return (
      <>
        <RichTextEditor aria-label="Note" onChange={setValue} value={value} />
        <button onClick={() => setValue('')} type="button">
          Clear
        </button>
      </>
    );
  }
  await render(<Clearable />);
  await expect.element(page.getByText('Draft')).toBeVisible();
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect.element(page.getByText('Draft')).not.toBeInTheDocument();
});

test('stops typing at maxLength', async () => {
  const onChange = vi.fn();
  function Limited() {
    const [value, setValue] = useState('');
    return (
      <RichTextEditor
        aria-label="Note"
        maxLength={5}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
        value={value}
      />
    );
  }
  await render(<Limited />);
  await page.getByRole('textbox', { name: 'Note' }).click();
  await userEvent.keyboard('abcdefgh');
  await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith('abcde'));
});

test('takes an id for label association and marks required fields', async () => {
  await render(
    <>
      <label htmlFor="reason">Reason</label>
      <RichTextEditor aria-label="Reason" aria-required id="reason" onChange={vi.fn()} value="" />
    </>
  );
  const box = page.getByRole('textbox', { name: 'Reason' });
  await expect.element(box).toHaveAttribute('id', 'reason');
  await expect.element(box).toHaveAttribute('aria-required', 'true');
});

test('marks the empty editor and inline code with the classes globals.css styles', async () => {
  await render(<Harness />);
  const box = page.getByRole('textbox', { name: 'Note' });
  await vi.waitFor(() =>
    expect(
      box.element().querySelector('p.rich-text-placeholder')?.getAttribute('data-placeholder')
    ).toBe('Write a note')
  );
  await box.click();
  await userEvent.keyboard('`Pisa`');
  await vi.waitFor(() =>
    expect(box.element().querySelector('code')?.className).toBe('rich-text-code')
  );
  expect(box.element().querySelector('.rich-text-placeholder')).toBeNull();
});
