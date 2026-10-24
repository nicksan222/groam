import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { IssueRule } from '@/types/issues';
import { RuleMagicInput } from './rule-magic-input';

const rule: IssueRule = { items: [{ kind: 'has_dates' }], match: 'all' };

describe('RuleMagicInput', () => {
  test('disables drafting until there is text', async () => {
    await render(<RuleMagicInput generate={vi.fn()} onRule={vi.fn()} />);
    const submit = page.getByTestId(testIds.ruleMagicSubmit);
    await expect.element(submit).toBeDisabled();
    await page.getByLabelText('Describe when this is done').fill('   ');
    await expect.element(submit).toBeDisabled();
    await page.getByLabelText('Describe when this is done').fill('has dates');
    await expect.element(submit).toBeEnabled();
  });

  test('Enter drafts without submitting an enclosing form, then clears', async () => {
    const generate = vi.fn().mockResolvedValue(rule);
    const onRule = vi.fn();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    await render(
      <form onSubmit={onSubmit}>
        <RuleMagicInput generate={generate} onRule={onRule} />
        <button type="submit">Save</button>
      </form>
    );
    const input = page.getByLabelText('Describe when this is done');
    await input.fill('  has dates ');
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(onRule).toHaveBeenCalledWith(rule));
    expect(generate).toHaveBeenCalledWith('has dates');
    expect(onSubmit).not.toHaveBeenCalled();
    await expect.element(input).toHaveValue('');
  });

  test('ignores Enter while an IME composition is active', async () => {
    const generate = vi.fn().mockResolvedValue(rule);
    await render(<RuleMagicInput generate={generate} onRule={vi.fn()} />);
    const input = page.getByLabelText('Describe when this is done');
    await input.fill('has dates');
    const element = input.element() as HTMLInputElement;
    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        isComposing: true,
        key: 'Enter'
      })
    );
    expect(generate).not.toHaveBeenCalled();
  });

  test('shows a spinner while pending and locks the input', async () => {
    let resolve: (value: IssueRule | null) => void = () => undefined;
    const generate = vi.fn(
      () =>
        new Promise<IssueRule | null>((done) => {
          resolve = done;
        })
    );
    await render(<RuleMagicInput generate={generate} onRule={vi.fn()} />);
    await page.getByLabelText('Describe when this is done').fill('has dates');
    await page.getByTestId(testIds.ruleMagicSubmit).click();
    await expect
      .element(page.getByTestId(testIds.ruleMagicSubmit))
      .toHaveAttribute('aria-busy', 'true');
    await expect.element(page.getByTestId(testIds.ruleMagicSubmit)).toBeDisabled();
    await expect.element(page.getByLabelText('Describe when this is done')).toBeDisabled();
    resolve(null);
    await expect
      .element(page.getByTestId(testIds.ruleMagicSubmit))
      .not.toHaveAttribute('aria-busy');
  });

  test('shows why drafting failed and keeps the text', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('Assistant is unavailable'));
    await render(<RuleMagicInput generate={generate} onRule={vi.fn()} />);
    const input = page.getByLabelText('Describe when this is done');
    await input.fill('has dates');
    await page.getByTestId(testIds.ruleMagicSubmit).click();
    await expect.element(page.getByRole('alert')).toHaveTextContent('Assistant is unavailable');
    await expect.element(input).toHaveValue('has dates');
  });

  test('keeps the text when nothing comes back', async () => {
    const generate = vi.fn().mockResolvedValue(null);
    const onRule = vi.fn();
    await render(<RuleMagicInput generate={generate} onRule={onRule} />);
    const input = page.getByLabelText('Describe when this is done');
    await input.fill('gibberish');
    await page.getByTestId(testIds.ruleMagicSubmit).click();
    await vi.waitFor(() => expect(generate).toHaveBeenCalled());
    await expect.element(page.getByTestId(testIds.ruleMagicSubmit)).toBeEnabled();
    expect(onRule).not.toHaveBeenCalled();
    await expect.element(input).toHaveValue('gibberish');
  });

  test('caps the request at the length the server accepts', async () => {
    await render(<RuleMagicInput generate={vi.fn()} onRule={vi.fn()} />);
    await expect
      .element(page.getByLabelText('Describe when this is done'))
      .toHaveAttribute('maxlength', '500');
  });

  test('disabled locks input and button', async () => {
    await render(<RuleMagicInput disabled generate={vi.fn()} onRule={vi.fn()} />);
    await expect.element(page.getByLabelText('Describe when this is done')).toBeDisabled();
    await expect.element(page.getByTestId(testIds.ruleMagicSubmit)).toBeDisabled();
  });
});
