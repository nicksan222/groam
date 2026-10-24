import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AgentRerunButton } from './agent-rerun-button';

describe('AgentRerunButton', () => {
  test('uses the default label', async () => {
    await render(<AgentRerunButton onRerun={vi.fn()} />);
    await expect.element(page.getByRole('button', { name: 'Re-run' })).toBeEnabled();
  });

  test('uses a custom label and test id', async () => {
    await render(<AgentRerunButton label="Retry from zero" onRerun={vi.fn()} testId="my-rerun" />);
    await expect.element(page.getByTestId('my-rerun')).toHaveTextContent('Retry from zero');
  });

  test('is busy and disabled while the rerun is pending, then re-enabled', async () => {
    let finish: () => void = () => undefined;
    const onRerun = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    await render(<AgentRerunButton onRerun={onRerun} testId="my-rerun" />);
    const button = page.getByTestId('my-rerun');
    await button.click();
    await expect.element(button).toBeDisabled();
    await expect.element(button).toHaveAttribute('aria-busy', 'true');
    expect(onRerun).toHaveBeenCalledTimes(1);

    finish();
    await expect.element(button).toBeEnabled();
    await expect.element(button).not.toHaveAttribute('aria-busy');
  });
});
