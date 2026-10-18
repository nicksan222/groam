---
name: convex-agent
description: "Add or extend a Groam AI agent backed by the existing Convex Agent component and personal ChatGPT connection."
---

# Extend Groam agents

Groam already mounts `@convex-dev/agent` and uses personal ChatGPT OAuth grants.
Follow the existing assistant module and the `add-assistant-agent` skill when
adding tools or agent behavior.

- Resolve the model with `AssistantProvider.configured(ctx, scope)` from
  `packages/backend/convex/modules/ai/provider.ts`. The scope identifies the
  initiating user's `userId` and `organizationId`.
- Preserve that initiating user through background work and tool calls.
- Keep threads, message history, and tool execution in the existing Agent flow.
- Model calls run in actions. Keep OAuth credentials inside the trusted backend.
- Respect the ChatGPT request adapter's supported capabilities; do not introduce
  API keys, AI gateways, provider registries, or shared inference fallbacks.
