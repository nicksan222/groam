# Tools

Agent-callable tools registered for Convex `@convex-dev/agent`. They live
outside `convex/` because these are runtime helpers, not deployable Convex modules.

| Subfolder | Role |
| --- | --- |
| `kinds/` | One file per tool kind (itinerary reads/writes, choices, web search, …) |
| `trips/` | Shared trip mutation helpers used by multiple tool kinds |
| `factory.ts` | Builds the tool set for a given agent capability list |
| `index.ts` | Public registry and `createRegisteredAssistantTools` |

Tools depend on agent registry types but never on React UI.

To add one: add the capability id in `@groam/ai-contracts`, create one
`kinds/<tool>.ts` file, register it in `kinds/index.ts`, and allow it on the
agent kind. There is no second frontend catalog.
