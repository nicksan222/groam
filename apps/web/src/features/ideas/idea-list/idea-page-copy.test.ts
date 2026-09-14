import { expect, test } from 'vitest';
import {
  conversationEmptyBody,
  conversationPurpose,
  ideaDetailNotice,
  ideaRowPurpose,
  ideaWorkspaceNotice
} from './idea-page-copy';

test('ideaRowPurpose explains how an idea moves from edits to the shared trip', () => {
  expect(ideaRowPurpose('draft', true)).toMatch(/Your idea/u);
  expect(ideaRowPurpose('draft', true)).toMatch(/send it for review/u);
  expect(ideaRowPurpose('draft', false)).toMatch(/only the author can edit/u);
  expect(ideaRowPurpose('in_review', false)).toMatch(/applied to the shared trip/u);
  expect(ideaRowPurpose('conflicted', false)).toMatch(/shared trip changed/iu);
  expect(ideaRowPurpose('merged', false)).toBeNull();
});

test('ideaDetailNotice explains editing, review, and applying', () => {
  expect(ideaDetailNotice('draft')?.title).toBe('Draft');
  expect(ideaDetailNotice('draft')?.description).toMatch(/send them for review/u);
  expect(ideaDetailNotice('in_review')?.title).toBe('In review');
  expect(ideaDetailNotice('in_review')?.description).toMatch(/until this idea is applied/u);
  expect(ideaDetailNotice('merged')).toBeNull();
});

test('ideaWorkspaceNotice names the shared trip and says it is unchanged', () => {
  expect(
    ideaWorkspaceNotice({
      authorName: 'Alex',
      canEdit: true,
      sharedTripName: 'Atlantic week',
      status: 'draft'
    })
  ).toMatchObject({
    description:
      'Atlantic week stays unchanged. Make changes here, then send them for review when ready.',
    title: 'You’re editing a draft'
  });
});

test('conversation copy matches draft vs group-review vs closed', () => {
  expect(conversationPurpose('draft', true)).toMatch(/send this idea for review/u);
  expect(conversationPurpose('in_review', true)).toMatch(/Request changes/u);
  expect(conversationPurpose('closed', false)).toBe('This conversation is closed.');
  expect(conversationEmptyBody(true, 'in_review')).toMatch(/Ask a question/u);
  expect(conversationEmptyBody(true, 'draft')).toMatch(/Leave a note/u);
});
