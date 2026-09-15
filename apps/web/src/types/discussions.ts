import type { UIMessage } from '@convex-dev/agent/react';
import type { api } from '@groam/backend/api';
import type { FunctionReturnType } from 'convex/server';

export type DiscussionStoredMedia = FunctionReturnType<
  typeof api.routes.discussions.messages.attachments.run
>[string][number];
export type DiscussionMessageMedia = Omit<DiscussionStoredMedia, 'id' | 'size'> &
  Partial<Pick<DiscussionStoredMedia, 'id' | 'size'>>;

export type DiscussionListItem = FunctionReturnType<typeof api.routes.discussions.list.run>[number];

export type DiscussionMember = FunctionReturnType<typeof api.routes.discussions.roster.run>[number];

export type DiscussionMessage = UIMessage & {
  attachments?: DiscussionMessageMedia[];
  author?: DiscussionListItem['createdBy'];
  media?: DiscussionMessageMedia[];
  mine?: boolean;
};

export type DiscussionSendInput = {
  files?: File[];
  text: string;
};

export type DiscussionPendingUserMessage = {
  baselineKeys: Set<string>;
  createdAt: number;
  key: string;
  media: Array<Pick<DiscussionMessageMedia, 'contentType' | 'name' | 'size' | 'url'>>;
  prompt: string;
  threadId: string;
};

export type ThreadReactionStamp = {
  count: number;
  emoji: string;
  label: string;
  mine: boolean;
};
