import type { Doc } from '#convex-generated/dataModel';

export type UsableChatGptConnection = Doc<'chatgptConnections'> & {
  tokens: NonNullable<Doc<'chatgptConnections'>['tokens']>;
};
