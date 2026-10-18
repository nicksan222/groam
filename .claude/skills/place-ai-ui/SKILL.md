---
name: place-ai-ui
description: >-
  Place Groam assistant React UI in packages/ai/src/ui rather than apps/web
  or packages/ui. Use when adding chat widget, composer, message bubble,
  tool-call card, agent run banner, attachment picker, or agent screen-context
  provider pieces.
---

# Place assistant UI

In-app AI chrome lives in `packages/ai/src/ui/`. Apps import it only through
published `@groam/ai/ui/<area>/<file>` subpaths.

## Folders

| Subfolder | Put here |
| --- | --- |
| `context/` | `useSetAgentContext`, `AgentContextProvider`, screen-context serialization |
| `chat/` | Floating widget, composer, side chat, suggested prompts |
| `messages/` | Bubbles, sources, context markers, failed/system messages |
| `form/` | Rendering assistant JSON forms (inputs, recap) |
| `tool-calls/` | Activity and choice cards |
| `attachments/` | Context tag picker and chips |
| `runs/` | Agent run banner, retry-from-zero |
| `hooks/` | Client chat state (`use-assistant`, `use-assistant-chats`) |
| `shared/` | Error boundary, json-render component strategies |

## Import and publish

- Inside `packages/ai`, import `.ts` and `.tsx` alike via `#ai/ui/...`
  (`#ai/*` maps to `./src/*`).
- New entrypoints apps need: add an explicit key to `packages/ai/package.json`
  `exports`, next to the existing ones:

```json
"./ui/runs/agent-run-banner": "./src/ui/runs/agent-run-banner.tsx"
```

```ts
import { AgentRunBanner } from '@groam/ai/ui/runs/agent-run-banner';
import { useAssistant } from '@groam/ai/ui/hooks/use-assistant';
```

An import of an unexported `@groam/ai/...` subpath fails
`vp run lint:conventions` (`ai-imports`). Files under `src/ui` also follow the
one-component-per-file rule (see `split-feature-tsx`).

## Not here

| Need | Put it |
| --- | --- |
| Button, dialog, shell, sidebar | `packages/ui` (`place-ui-primitive`) |
| Agents roster / run log page | `apps/web/src/features/agents` (`place-feature-view`) |
| Agent identity, tools, exposure | `packages/ai/src/agents/<id>/definition.ts` (`add-assistant-agent`) |
| Form **catalog** (schema the model emits) | `packages/ai/src/runtime/output` (`add-json-render-component`) |
| Screen-target types | `packages/ai/src/runtime/screen` |

Do not copy chat hooks into the web app; import `@groam/ai/ui/hooks/*`.
