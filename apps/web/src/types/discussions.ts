import type { UIMessage } from '@convex-dev/agent/react';
import type { api } from '@groam/backend/api';
import type { FunctionReturnType } from 'convex/server';
import type { ReactNode } from 'react';

export type DiscussionStoredMedia = FunctionReturnType<
  typeof api.routes.discussions.messages.attachments.run
>[string][number];
export type DiscussionMessageMedia = Omit<DiscussionStoredMedia, 'id' | 'size'> &
  Partial<Pick<DiscussionStoredMedia, 'id' | 'size'>>;

export type DiscussionListItem = FunctionReturnType<typeof api.routes.discussions.list.run>[number];

export type DiscussionMember = FunctionReturnType<typeof api.routes.discussions.roster.run>[number];

export type DiscussionMessage = UIMessage & {
  assistantError?: string;
  assistantStatus?: 'requested' | 'responding' | 'complete' | 'failed';
  attachments?: DiscussionMessageMedia[];
  author?: DiscussionListItem['createdBy'];
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

export type ComposerCommandOption = {
  group?: string;
  id: string;
  label: string;
  run: () => unknown;
};

/** A "/name" action typed in a thread composer instead of a message. */
export type ComposerCommand = {
  /** Hint for the text after the name, such as "item" or "text"; omit for commands without input. */
  argument?: string;
  description: string;
  name: string;
  /** Pick-from-list commands: the choices matching the text after the name. */
  options?: (query: string) => ComposerCommandOption[];
  /** Free-text or no-input commands. */
  run?: (argument: string) => unknown;
};

export type ParsedCommandInput = { argument: string; hasArgument: boolean; name: string };

export type CommandSubmit = { error: string } | { run: () => unknown };

/** A non-message row placed among thread messages by time. */
export type DiscussionTimelineEvent = { content: ReactNode; createdAt: number; key: string };
