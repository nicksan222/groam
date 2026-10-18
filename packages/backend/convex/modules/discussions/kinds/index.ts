/** Every kind-dependent decision about a conversation reads this policy, never a `kind` literal. */
export type ConversationKind = 'group' | 'assistant' | 'research';

export type KindPolicy = {
  /** Who may read and post. */
  audience: 'members' | 'owner' | 'trip';
  /** Whether the row carries a trip. */
  trip: 'optional' | 'none' | 'required';
  /** When an agent replies to a human message. */
  agentTrigger: 'mention' | 'always';
  /** Where the conversation is listed in the web app. */
  home: 'chats' | 'assistant' | 'trip';
  /** Whether discussionLinks may point from this conversation. */
  links: boolean;
};

export const conversationKinds = {
  group: {
    agentTrigger: 'mention',
    audience: 'members',
    home: 'chats',
    links: false,
    trip: 'optional'
  },
  assistant: {
    agentTrigger: 'always',
    audience: 'owner',
    home: 'assistant',
    links: false,
    trip: 'none'
  },
  research: {
    agentTrigger: 'mention',
    audience: 'trip',
    home: 'trip',
    links: true,
    trip: 'required'
  }
} as const satisfies Record<ConversationKind, KindPolicy>;

export function kindPolicy(kind: ConversationKind): KindPolicy {
  return conversationKinds[kind];
}

/** Kinds whose conversations appear in the given home. */
export function kindsForHome(home: KindPolicy['home']): ConversationKind[] {
  return (Object.keys(conversationKinds) as ConversationKind[]).filter(
    (kind) => conversationKinds[kind].home === home
  );
}
