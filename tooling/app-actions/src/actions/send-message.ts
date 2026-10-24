export type SendMessageInput = {
  discussionId?: string;
  text: string;
};

export type SendMessageAction<Actor> = (actor: Actor, input: SendMessageInput) => Promise<void>;
