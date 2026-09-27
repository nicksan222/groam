import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AssistantErrorBoundary } from './assistant-error-boundary';

function BrokenAssistant(): never {
  throw new Error('Assistant subscription failed');
}

afterEach(cleanup);

test('contains assistant failures instead of taking down the workspace', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const view = render(
    <div>
      <main>Trips remain available</main>
      <AssistantErrorBoundary resetKey="organization-1">
        <BrokenAssistant />
      </AssistantErrorBoundary>
    </div>
  );

  expect(screen.getByText('Trips remain available')).toBeDefined();
  expect(screen.getByRole('alert').textContent).toContain('Groam AI is temporarily unavailable');

  view.rerender(
    <div>
      <main>Trips remain available</main>
      <AssistantErrorBoundary resetKey="organization-2">
        <span>Assistant recovered</span>
      </AssistantErrorBoundary>
    </div>
  );
  expect(screen.getByText('Assistant recovered')).toBeDefined();
  consoleError.mockRestore();
});
