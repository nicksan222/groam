---
name: place-ai-ui
description: >-
  Place Groam assistant React UI in packages/ui/src/ai rather than apps/web
  or packages/ui. Use when adding chat widget, composer, message bubble,
  tool-call card, attachment picker, or agent screen-context provider pieces.
---

# Place assistant UI

In-app AI chrome lives in `packages/ui/src/ai/`. Apps import published
`@groam/ui/ai/<area>/<file>` entrypoints only.

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

Inside the package, import TSX with `#tsx/ai/...` and TypeScript with
`#src/ai/...`. Outside, use only published `@groam/ui/ai/*` paths.

New files need a matching `exports` key in `packages/ui/package.json`
(see existing `./ui/chat/ai-assistant-widget`).

## Not here

| Need | Put it |
| --- | --- |
| Button, shell, sidebar | `packages/ui` |
| Agents roster / run log page | `apps/web/src/features/agents` |
| Agent identity / prompts | `packages/ai-contracts/src/agents` |
| Form **catalog** (schema the model emits) | `packages/ai-contracts/src/output` |

Client chat state hooks go in `packages/ui/src/ai/hooks/` and are imported as
`@groam/ui/ai/hooks/use-assistant`, not copied into the web app.
