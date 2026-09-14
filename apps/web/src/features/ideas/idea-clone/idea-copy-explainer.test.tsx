import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { IdeaCopyExplainer } from './idea-copy-explainer';

afterEach(cleanup);

test('shows the shared trip and the private idea it creates', () => {
  render(<IdeaCopyExplainer originalName="Atlantic week" />);

  expect(screen.getByLabelText('How an idea works')).toBeTruthy();
  expect(screen.getByText('Atlantic week')).toBeTruthy();
  expect(screen.getByText('Everyone sees this')).toBeTruthy();
  expect(screen.getByText('Your idea')).toBeTruthy();
  expect(screen.getByText('Edit here')).toBeTruthy();
  expect(screen.getByText('New idea')).toBeTruthy();
});
