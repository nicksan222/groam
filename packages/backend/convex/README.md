# Convex backend

- `convex.config.ts` mounts Better Auth, Agent, Rate Limiter, the geospatial index, migrations, and both Static Hosting instances.
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

### Setup

```sh
npx convex env set AI_PROVIDER openai # or anthropic/google
npx convex env set AI_MODEL "your-model-id"
npx convex env set OPENAI_API_KEY "your-key" # or ANTHROPIC_API_KEY/GOOGLE_GENERATIVE_AI_API_KEY
```

OpenRouter uses the OpenAI-compatible adapter:

```sh
npx convex env set AI_PROVIDER openai
npx convex env set OPENAI_API_MODE chat
npx convex env set OPENAI_BASE_URL https://openrouter.ai/api/v1
npx convex env set OPENAI_API_KEY "your-openrouter-key"
npx convex env set AI_MODEL "your-openrouter-model-id"
```

Local AI values in `.env.local` are synchronized to Convex by `bun run dev`
(the hosted-web development path). Credential selection is centralized and uses
deployment credentials first, then an account-wide personal key, then the active
organization's shared key. Personal and organization connections support OpenAI,
Anthropic, Google, OpenRouter, and OpenAI-compatible hosts such as Ollama. OpenRouter
can be connected with OAuth PKCE from **Settings → AI**; stored secrets are never
returned to the browser. When deployment credentials cover every configured agent,
AI settings are hidden and stored keys are ignored. OpenAI-compatible and OpenRouter
keys run in `chat` mode, so provider-native web search is disabled for those hosts.

The Convex Cloud deployment owner selects the provider and model with typed variables
registered in `convex.config.ts`:

- `AI_PROVIDER`: `openai` (default), `anthropic`, or `google`
- `AI_MODEL`: any model identifier accepted by the selected provider; defaults
  to `gpt-5-mini`, `claude-sonnet-4-5`, or `gemini-2.5-flash`
- `AI_WEB_SEARCH`: `enabled` (default) or `disabled`
- `AI_AGENT_MODELS`: an optional validated JSON map for assigning different
  providers and models to individual agents, for example
  `{"groam":{"provider":"openai","model":"gpt-5-mini"},"reviewer":{"provider":"anthropic","model":"claude-haiku-4-5"}}`
- Provider credentials: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or
  `GOOGLE_GENERATIVE_AI_API_KEY`
- Optional provider endpoints: `OPENAI_BASE_URL`, `ANTHROPIC_BASE_URL`, and
  `GOOGLE_GENERATIVE_AI_BASE_URL`
- `OPENAI_API_MODE`: `responses` (default) or `chat`

OpenAI-compatible hosts can use `AI_PROVIDER=openai` with
`OPENAI_BASE_URL` and their model id. Provider and mode values are validated by
Convex before deployment; per-agent JSON is parsed into a typed, agent-checked
map before any model is created. Each provider receives its required native web
search tool name (`web_search` or `google_search`). Missing credentials fail
with the exact relevant variable name; the default remains
`Groam AI is not configured. Add an API key in Settings → AI.` Local development never
installs or starts a fallback model server. Point Settings → AI at Ollama
(`http://127.0.0.1:11434/v1`) or set `OPENAI_BASE_URL` on the Convex deployment
for any OpenAI-compatible host.

Better Auth secrets (`BETTER_AUTH_SECRET`, `SITE_URL`) are written by
`tooling/devkit/configure-auth.ts` during `bun run dev` / desktop runtime
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
