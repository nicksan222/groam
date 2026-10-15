import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IdeaCopyExplainer } from './idea-copy-explainer';

test('shows the shared trip and the private idea it creates', async () => {
  await render(<IdeaCopyExplainer originalName="Atlantic week" />);

  await expect.element(page.getByLabelText('How an idea works')).toBeInTheDocument();
  await expect.element(page.getByText('Atlantic week')).toBeInTheDocument();
  await expect.element(page.getByText('Everyone sees this')).toBeInTheDocument();
  await expect.element(page.getByText('Your idea')).toBeInTheDocument();
  await expect.element(page.getByText('Edit here')).toBeInTheDocument();
  await expect.element(page.getByText('New idea')).toBeInTheDocument();
});
