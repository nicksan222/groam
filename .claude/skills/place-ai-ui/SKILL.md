---
name: place-ai-ui
description: >-
  Place Groam assistant React UI in packages/ai/src/ui rather than apps/web
  or packages/ui. Use when adding chat widget, composer, message bubble,
  tool-call card, attachment picker, or agent screen-context provider pieces.
---

# Place assistant UI

In-app AI chrome lives in `packages/ai/src/ui/`. Apps import published
`@groam/ai/ui/<area>/<file>` entrypoints only. Each agent's presentation
surface is composed in `packages/ai/src/agents/<id>/ui.ts`; put only shared
chrome in `ui/`.

## Folders

| Subfolder | Put here |
| --- | --- |
| `context/` | `useSetAgentContext`, serialization |
| `chat/` | Floating widget, composer, suggested prompts |
| `messages/` | Bubbles, sources, context markers |
| `form/` | Rendering assistant JSON forms |
| `tool-calls/` | Activity and choice cards |
| `attachments/` | Context tag picker |
| `shared/` | Error boundary, json-render wiring |

Inside the package, import both TSX and TypeScript with `#ai/ui/...`.
Outside, use only published `@groam/ai/ui/*` paths.

New files need a matching `exports` key in `packages/ai/package.json`
(see existing `./ui/chat/ai-assistant-widget`).

## Not here

| Need | Put it |
| --- | --- |
| Button, shell, sidebar | `packages/ui` |
| Agents roster / run log page | `apps/web/src/features/agents` |
| Agent identity / tools / exposure | `packages/ai/src/agents/<id>/` |
| Form **catalog** (schema the model emits) | `packages/ai/src/runtime/output` |

Client chat state hooks go in `packages/ai/src/ui/hooks/` and are imported as
`@groam/ai/ui/hooks/use-assistant`, not copied into the web app.
