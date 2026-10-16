import { expectConsole } from '@groam/vitest-config/console';
import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AssistantErrorBoundary } from './assistant-error-boundary';

function BrokenAssistant(): never {
  throw new Error('Assistant subscription failed');
}

test('contains assistant failures instead of taking down the workspace', async () => {
  // React reports the error the boundary catches.
  expectConsole('error', 'Assistant subscription failed');
  const view = await render(
    <div>
      <main>Trips remain available</main>
      <AssistantErrorBoundary resetKey="organization-1">
        <BrokenAssistant />
      </AssistantErrorBoundary>
    </div>
  );

  await expect.element(page.getByText('Trips remain available')).toBeInTheDocument();
  expect(page.getByRole('alert').element().textContent).toContain(
    'Groam AI is temporarily unavailable'
  );

  await view.rerender(
    <div>
      <main>Trips remain available</main>
      <AssistantErrorBoundary resetKey="organization-2">
        <span>Assistant recovered</span>
      </AssistantErrorBoundary>
    </div>
  );
  await expect.element(page.getByText('Assistant recovered')).toBeInTheDocument();
});
