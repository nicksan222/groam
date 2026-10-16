# Convex backend

- `convex.config.ts` mounts Better Auth, Agent, Rate Limiter, the geospatial index, and both Static Hosting instances.
- `components/better-auth/` owns Better Auth's isolated local component.
- `modules/auth/`, `auth.config.ts`, and `http.ts` provide application auth integration and routing.
- `routes/` owns public Convex functions for product domains. See `modules/README.md`.
- `schema.ts` assembles application tables and indexes from schema fragments colocated with their
  domain modules. Uploaded files live in `modules/media` (`Files`, `Media`, `Attachments`).
  Shared chats live in `modules/discussions` (`Messages`, `Discussions`).
- Local development seeding is orchestrated by `tooling/app-actions/src/backend/seed-workspace.ts`
  and calls real product procedures.

Both `web` deploys through `@convex-dev/static-hosting`. Better Auth routes are
registered first in `http.ts`; the web SPA owns `/`.

## Procedure convention

Each public function has one route module under `routes/<domain>/<operation>.ts`
and exports `run`, for example `routes/trips/create.ts`. Custom builders in
`modules/` bind workspace and trip onto `ctx` so handlers receive only new
input. Shared writes are plain `(ctx, input)` helpers, not entity classes.
Keep scheduled and `'use node'` jobs on raw internal functions. See
`modules/README.md`.

Use indexed, organization-scoped reads and bounded results. Lists that can grow
without a small product limit must use Convex pagination. Better Auth owns users,
organizations, memberships, and invitations in the mounted local
component; application tables reference its string IDs without duplicating
those models.

## AI agents

- Each chat is a durable, workspace-bound `@convex-dev/agent` thread.
  `@groam` continues the selected thread, so the component supplies shared
  user, agent, and tool history automatically. Standalone **Issue** and
  **Idea reviewer** workers run without a chat thread. The compact screen
  assistant resumes the most recently active chat; `/chat` exposes the
  searchable native thread list.
- Message pagination, attribution, reactive subscriptions, saved stream
  deltas, actions, tool results, and choice polls use native Agent message parts
  through `listUIMessages`, `syncStreams`, and frontend `useUIMessages` rather
  than application message storage or handoff code. Travelers can abort active
  persisted streams without abandoning the thread.
- Pages register a title, purpose, visible data, resource target, and explicit
  capabilities through `useSetAgentContext`. Screen data is not injected into
  every model request: the agent calls `getScreenContext` when it needs it.
  Before every user message, a lightweight location and attachment snapshot is
  saved as a native system message and rendered as a context marker in history.
  A route coverage test fails when a new product page omits context.
- Chats attach trips, destinations, and activities in native Agent thread metadata.
  The backend resolves every tag authoritatively. Context tools let agents read,
  find, and replace those tags without a parallel chat or message table; newly
  created trip proposals are attached automatically for immediate follow-up.
- A chat is not trapped by the screen where it started. Tools are selected from
  the invoked agent, attached entities, and backend-verified workspace/trip
  access; page capabilities are informational context, not a security filter.
  The LLM sees every tool registered for the invoked agent and decides which
  tools to call; screen capabilities and prompt keyword matching never choose a
  tool for it. Write tools remain visible but reject execution unless the
  current traveler message explicitly requests or confirms their registered
  intent, and every write reauthorizes through its underlying domain model.
  Tools are declared with `defineCapability` and
  `AssistantToolKind.subscribe`'d from a typed catalog in
  `packages/backend/assistant/tools/kinds/index.ts`. A declaration owns its capability id,
  tool name, optional write-intent phrases, model guidance, and runtime factory,
  so a new capability does not require editing agent orchestration, prompt
  switches, or frontend tool-name maps. Agents allowlist those capability ids.
  For example:

  ```ts
  export const proposeThingCapability = defineCapability({
    create: (runtime) => createProposeThingTool(runtime),
    guidance: 'Call proposeThing only after explicit confirmation.',
    id: 'trip.thing.propose',
    toolName: 'proposeThing',
    writeIntent: ['create', 'propose']
  });
  ```

  The domain registry currently covers trip proposals,
  lifecycle/approval/policy actions, and confirmed activities; new product
  actions extend a typed domain registry rather than a generic executor.
- Per-user component-backed rate limits protect thread creation and every model
  entry point.

## AI configuration

Sign in to Groam, then open **Settings → AI → Continue with ChatGPT**.
Each traveler connects their own account, selects an available model, and can
reconnect or disconnect from the same page. Connecting ChatGPT is separate from
Groam login. Eligible requests, including background work, use the initiating
traveler's ChatGPT plan. Missing or expired connections stop AI work; there is
no developer API-key or shared-credential fallback. Credentials stay in the
backend, outside environment variables and browser settings queries.

Local web and desktop authorization returns to the running Convex HTTP server at
`http://127.0.0.1:3211/auth/chatgpt/callback`. Keep the runtime running and ensure
the authorizing browser can reach that address. Remote development may need an
SSH tunnel forwarding local port 3211 to the runtime's port 3211; keep it active
through sign-in. See OpenAI's [self-hosted VM guidance](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms).

Shared hosted AI is unavailable until an OpenAI-approved ChatGPT plan-usage
integration is supplied. A website client ID alone does not enable plan-funded
inference; the local OAuth flow must not use a shared remote callback. See the
[official integration documentation](https://developers.openai.com/siwc/token-sharing-open-source).

Better Auth secrets (`BETTER_AUTH_SECRET`, `SITE_URL`) are written by
`tooling/devkit/configure-auth.ts` during `vp run dev` / desktop runtime
startup; they are not listed in `@groam/env`.

## Testing

`../testing/factory.ts` loads the Convex function graph once and registers the
local Better Auth, Agent, and Rate Limiter components. Authenticated fixtures
use Better Auth's browser client against the real `convex-test` HTTP router, so
users, sessions, organizations, memberships, JWTs, agent threads, and tool calls
all pass through production handlers and component adapters. Do not mock
procedures, auth state, storage, or component calls. Agent model doubles are
defined only in colocated `*.test.ts` modules, which Convex excludes from
production deployments. These doubles replace only the provider response: they
emit deterministic text and tool-call steps while the real Agent loop resolves
registered tools, executes authorized domain functions, and persists native
messages and tool parts.
