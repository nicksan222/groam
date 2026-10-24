import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { CurrentPasswordField } from './current-password-field';

describe('CurrentPasswordField', () => {
  test('renders a labeled password input with its value', async () => {
    await render(<CurrentPasswordField disabled={false} onChange={vi.fn()} value="hunter22" />);
    const input = page.getByLabelText('Current password');
    await expect.element(input).toHaveValue('hunter22');
    await expect.element(input).toHaveAttribute('type', 'password');
    await expect.element(input).toHaveAttribute('autocomplete', 'current-password');
  });

  test('reports typed values to onChange', async () => {
    const onChange = vi.fn();
    await render(<CurrentPasswordField disabled={false} onChange={onChange} value="" />);
    await page.getByLabelText('Current password').fill('abc');
    expect(onChange).toHaveBeenLastCalledWith('abc');
  });

  test.each([
    ['disabled', { disabled: true }, 'disabled'],
    ['required', { disabled: false, required: true }, 'aria-required']
  ])('applies the %s flag', async (_, props, attribute) => {
    await render(<CurrentPasswordField onChange={vi.fn()} value="" {...props} />);
    await expect.element(page.getByLabelText('Current password')).toHaveAttribute(attribute);
  });

  test('forwards the test id', async () => {
    await render(
      <CurrentPasswordField disabled={false} onChange={vi.fn()} testId="pw-field" value="" />
    );
    await expect.element(page.getByTestId('pw-field')).toBeVisible();
  });
});
