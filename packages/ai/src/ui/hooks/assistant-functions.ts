import type { StreamArgs, SyncStreamsReturnValue } from '@convex-dev/agent';
import type { UIMessage } from '@convex-dev/agent/react';
import type { FunctionReference, PaginationOptions, PaginationResult } from 'convex/server';

/**
 * The slice of the backend api object assistant UI may call, injected by the
 * host app as a single `api` prop. This keeps `@groam/ai` free of the
 * `@groam/backend` dependency (the backend already depends on this package,
 * so the reverse edge would be a dependency cycle) while spelling out the
 * exact contract: hook bodies cannot reach routes outside this shape, and
 * renaming a route breaks callers at compile time. Payload shapes flow
 * through `convex/react` as written, with no `any` anywhere.
 *
 * The messages query spells out the agent streaming protocol (paginated full
 * messages plus sync streams) with library types rather than the loose
 * reference, so `useUIMessages` keeps returning exact `UIMessage`s.
 */
export type AssistantBackendApi = {
  routes: {
    assistant: {
      chats: {
        create: { run: FunctionReference<'action', 'public'> };
        list: { run: FunctionReference<'query', 'public'> };
        tags: { run: FunctionReference<'mutation', 'public'> };
      };
      context: {
        catalog: { run: FunctionReference<'query', 'public'> };
        screen: { run: FunctionReference<'mutation', 'public'> };
      };
      messages: {
        run: FunctionReference<
          'query',
          'public',
          {
            paginationOpts: PaginationOptions;
            streamArgs?: StreamArgs;
            threadId: string;
          },
          PaginationResult<UIMessage> & { streams: SyncStreamsReturnValue }
        >;
      };
      open: { run: FunctionReference<'action', 'public'> };
      resend: { run: FunctionReference<'action', 'public'> };
      send: { run: FunctionReference<'action', 'public'> };
      stop: { run: FunctionReference<'mutation', 'public'> };
    };
  };
};
