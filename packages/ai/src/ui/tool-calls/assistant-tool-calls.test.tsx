import type { UIMessage } from '@convex-dev/agent/react';
import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AssistantToolCalls } from './assistant-tool-calls';

function toolPart(state: string, extra: Record<string, unknown> = {}) {
  return [
    { input: {}, state, toolCallId: 'call-1', type: 'tool-getTripStatus', ...extra }
  ] as unknown as UIMessage['parts'];
}

test('shows a running activity card as in progress while streaming', async () => {
  await render(<AssistantToolCalls disabled={false} parts={toolPart('input-available')} />);
  await expect.element(page.getByText('In progress')).toBeInTheDocument();
});

test('shows a completed activity card', async () => {
  await render(
    <AssistantToolCalls
      disabled={false}
      parts={toolPart('output-available', { output: {} })}
      settled
    />
  );
  await expect.element(page.getByText('Completed')).toBeInTheDocument();
});

test('shows a failed activity card', async () => {
  await render(
    <AssistantToolCalls
      disabled={false}
      parts={toolPart('output-error', { errorText: 'boom' })}
      settled
    />
  );
  await expect.element(page.getByText('Failed', { exact: true })).toBeInTheDocument();
});

test('stops the shimmer for a tool call that never got a result on a finished message', async () => {
  await render(<AssistantToolCalls disabled={false} parts={toolPart('input-available')} settled />);
  await expect.element(page.getByText('Stopped')).toBeInTheDocument();
  await expect.element(page.getByText('In progress')).not.toBeInTheDocument();
  expect(document.querySelector('.shimmer')).toBeNull();
});
