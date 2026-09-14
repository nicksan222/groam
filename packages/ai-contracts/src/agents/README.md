# Agents

Everything that defines *who* an agent is and *how* it runs.

| Subfolder | Role |
| --- | --- |
| `registry/` | Agent IDs, kind files, context tags, mention parsing |
| `instructions/` | Shared prompt assembly from each agent's identity and policies |
| `runs/` | Run IDs, roster status, event labels, time formatting |
| `standalone/` | Issue-agent session helpers (no chat thread) |
| `review/` | Idea reviewer structured output schema |
| `screen/` | Screen-context validation and limits |
| `targets/` | Resolve active trip from screen context |

## Add an agent

1. Add the id to `chatAgentIds` or `standaloneAgentIds` in `registry/ids.ts`.
2. Create `registry/kinds/<id>.ts` with `defineChatAgent` or `defineStandaloneAgent` (mention is derived from the id; put worker-specific rules in `policies`).
3. Register it on `assistantAgents` in `registry/kinds/index.ts`.

Instructions, assignable-id lists, mention parsing, and tool selection all follow the catalog. Do not special-case the new agent in `instructions/`.

Backend Convex code should import these modules directly; do not duplicate agent logic in `packages/backend`.
