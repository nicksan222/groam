import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ChatMessage } from './chat-message';

test('renders the discussion variant with participant metadata', async () => {
  await render(
    <ChatMessage authorName="Taylor" createdAt={1} mine={false} text="Airport rides?" />
  );
  await expect.element(page.getByText('Taylor')).toBeInTheDocument();
  await expect.element(page.getByText('Airport rides?')).toBeInTheDocument();
});

test('renders the private variant with delivery state', async () => {
  await render(<ChatMessage mine status="pending" text="Plan Portugal" variant="private" />);
  await expect.element(page.getByText('Plan Portugal')).toBeInTheDocument();
  expect(page.getByRole('status').element().textContent).toContain('Sending');
});

test('renders audio attachments with controls', async () => {
  await render(
    <ChatMessage
      attachments={[
        { contentType: 'audio/webm', name: 'voice-note.webm', url: 'https://example.com/a.webm' }
      ]}
      mine
      text=""
    />
  );
  expect(page.getByLabelText('voice-note.webm').element().tagName).toBe('AUDIO');
});

test('places actions and reactions beside the bubble column', async () => {
  await render(
    <ChatMessage
      actions={<button type="button">Add reaction</button>}
      mine
      reactions={<span>Love this</span>}
      text="Hi!"
    />
  );
  await expect.element(page.getByRole('button', { name: 'Add reaction' })).toBeInTheDocument();
  await expect.element(page.getByText('Love this')).toBeInTheDocument();
});

test('renders video attachments with a player', async () => {
  await render(
    <ChatMessage
      attachments={[
        { contentType: 'video/mp4', name: 'clip.mp4', url: 'https://example.com/clip.mp4' }
      ]}
      mine
      text=""
    />
  );
  expect(page.getByLabelText('clip.mp4').element().tagName).toBe('VIDEO');
});

test('auto-links URLs in message text', async () => {
  await render(<ChatMessage mine={false} text="Try https://trip.example/rome" />);
  await expect
    .element(page.getByRole('link', { name: 'https://trip.example/rome' }))
    .toHaveAttribute('href', 'https://trip.example/rome');
});

test('keeps reactions in flow above the sent time', async () => {
  await render(
    <ChatMessage
      createdAt={Date.UTC(2026, 0, 1, 9)}
      mine={false}
      reactions={<span data-testid="reactions">❤️</span>}
      text="Hi!"
    />
  );
  const reactions = page.getByTestId('reactions').element().getBoundingClientRect();
  const time = page.getByRole('status').element().getBoundingClientRect();
  expect(reactions.bottom).toBeLessThanOrEqual(time.top);
});
