import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { ChatMessage } from './chat-message';

afterEach(cleanup);

test('renders the discussion variant with participant metadata', () => {
  render(<ChatMessage authorName="Taylor" createdAt={1} mine={false} text="Airport rides?" />);
  expect(screen.getByText('Taylor')).toBeDefined();
  expect(screen.getByText('Airport rides?')).toBeDefined();
});

test('renders the private variant with delivery state', () => {
  render(<ChatMessage mine status="pending" text="Plan Portugal" variant="private" />);
  expect(screen.getByText('Plan Portugal')).toBeDefined();
  expect(screen.getByRole('status').textContent).toContain('Sending');
});

test('renders audio attachments with controls', () => {
  render(
    <ChatMessage
      attachments={[
        { contentType: 'audio/webm', name: 'voice-note.webm', url: 'https://example.com/a.webm' }
      ]}
      mine
      text=""
    />
  );
  expect(screen.getByLabelText('voice-note.webm').tagName).toBe('AUDIO');
});

test('places actions and reactions beside the bubble column', () => {
  render(
    <ChatMessage
      actions={<button type="button">Add reaction</button>}
      mine
      reactions={<span>Love this</span>}
      text="Hi!"
    />
  );
  expect(screen.getByRole('button', { name: 'Add reaction' })).toBeDefined();
  expect(screen.getByText('Love this')).toBeDefined();
});

test('renders video attachments with a player', () => {
  render(
    <ChatMessage
      attachments={[
        { contentType: 'video/mp4', name: 'clip.mp4', url: 'https://example.com/clip.mp4' }
      ]}
      mine
      text=""
    />
  );
  expect(screen.getByLabelText('clip.mp4').tagName).toBe('VIDEO');
});
