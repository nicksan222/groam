import { describe, expect, test } from 'vitest';
import { discussionMessageBody } from './discussion-message-body';

describe('discussionMessageBody', () => {
  test('keeps normal text without attachments', () => {
    expect(discussionMessageBody({ text: 'Hello' })).toEqual({
      attachments: [],
      text: 'Hello'
    });
  });

  test('hides auto preview labels when attachments are present', () => {
    const attachments = [
      { contentType: 'image/png', name: 'a.png', url: 'https://example.com/a.png' }
    ];
    expect(
      discussionMessageBody({ attachments, media: attachments, text: 'Sent a photo' })
    ).toEqual({ attachments, text: '' });
  });

  test('hides counted file labels when attachments resolve', () => {
    const attachments = [
      { contentType: 'application/pdf', name: 'a.pdf', url: 'https://example.com/a.pdf' },
      { contentType: 'application/pdf', name: 'b.pdf', url: 'https://example.com/b.pdf' }
    ];
    expect(discussionMessageBody({ attachments, text: 'Sent 2 files' })).toEqual({
      attachments,
      text: ''
    });
  });

  test('keeps preview label when attachments failed to resolve', () => {
    expect(discussionMessageBody({ text: 'Sent a photo' })).toEqual({
      attachments: [],
      text: 'Sent a photo'
    });
  });

  test('keeps real captions alongside attachments', () => {
    const attachments = [
      { contentType: 'image/png', name: 'a.png', url: 'https://example.com/a.png' }
    ];
    expect(discussionMessageBody({ attachments, text: 'Look at this sunset' })).toEqual({
      attachments,
      text: 'Look at this sunset'
    });
  });
});
