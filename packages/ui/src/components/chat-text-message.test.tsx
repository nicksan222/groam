import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ChatTextMessage } from './chat-text-message';

test('renders an incoming message with its author', async () => {
  await render(
    <ChatTextMessage author="Taylor" createdAt={1} side="incoming" text="Airport rides?" />
  );
  await expect.element(page.getByText('Taylor')).toBeInTheDocument();
  await expect.element(page.getByText('Airport rides?')).toBeInTheDocument();
});

test('announces a pending outgoing message', async () => {
  await render(<ChatTextMessage side="outgoing" status="pending" text="Plan Portugal" />);
  await expect.element(page.getByText('Plan Portugal')).toBeInTheDocument();
  expect(page.getByRole('status').element().textContent).toContain('Sending');
});

test('renders legacy audio as a file without audio or video playback', async () => {
  const { container } = await render(
    <ChatTextMessage
      attachments={[
        { contentType: 'audio/webm', name: 'voice-note.webm', url: 'https://example.com/a.webm' }
      ]}
      side="outgoing"
      text=""
    />
  );
  await expect.element(page.getByRole('link', { name: /voice-note.webm/ })).toBeVisible();
  expect(container.querySelector('audio, video')).toBeNull();
});

test('renders video attachments with a player', async () => {
  await render(
    <ChatTextMessage
      attachments={[
        { contentType: 'video/mp4', name: 'clip.mp4', url: 'https://example.com/clip.mp4' }
      ]}
      side="outgoing"
      text=""
    />
  );
  expect(page.getByLabelText('clip.mp4').element().tagName).toBe('VIDEO');
});

test('keeps actions on media-only messages', async () => {
  await render(
    <ChatTextMessage
      actions={<button type="button">Message actions</button>}
      attachments={[
        { contentType: 'image/png', name: 'map.png', url: 'https://example.com/map.png' }
      ]}
      side="incoming"
      text=""
    />
  );
  await expect.element(page.getByRole('button', { name: 'Message actions' })).toBeInTheDocument();
});

test('auto-links URLs and renders Markdown', async () => {
  await render(<ChatTextMessage side="incoming" text="**Bold** https://trip.example/rome" />);
  await expect
    .element(page.getByRole('link', { name: 'https://trip.example/rome' }))
    .toHaveAttribute('target', '_blank');
  expect(page.getByText('Bold').element().getAttribute('data-streamdown')).toBe('strong');
});

test('keeps reactions above the sent time', async () => {
  await render(
    <ChatTextMessage
      createdAt={Date.UTC(2026, 0, 1, 9)}
      reactions={<span data-testid="reactions">❤️</span>}
      side="incoming"
      text="Hi!"
    />
  );
  const reactions = page.getByTestId('reactions').element().getBoundingClientRect();
  const time = document.querySelector('time')?.getBoundingClientRect();
  expect(time).toBeDefined();
  expect(reactions.bottom).toBeLessThanOrEqual(time?.top ?? 0);
});
