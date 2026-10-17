# Client architecture

The web client is a React application. Its routes select feature views,
features adapt backend operations into interactions, and shared packages supply
presentation and cross-client contracts.

## Composition and navigation

The application root provides theme and authentication integration. The
authenticated workspace layout supplies the active organization, resource
reference resolution and global shell. The shell owns navigation, shared dialogs,
the assistant surface and the route outlet. Product views live in feature
domains rather than being implemented inside route definitions.

File-based routing defines the URL structure. Reference-aware navigation
resolves compact resource references and canonical URLs through shared helpers.
Navigation state identifies what the user is viewing; backend access checks
determine whether that resource can actually be loaded.

```mermaid
flowchart TB
  Root[Application root and authentication] --> Workspace[Workspace and reference providers]
  Workspace --> Shell[Workspace shell and route outlet]
  Shell --> View[Feature view]
  View --> Hooks[Feature data hooks]
  Hooks --> Backend[Generated Convex API]
  Backend --> Reactive[Reactive server results]
  Reactive --> View
  View <--> UIState[Transient stores and local context]
  View --> Context[Published screen context]
  View --> Primitives[Shared presentation components]
```

## State ownership

| State | Owner |
| --- | --- |
| Persistent domain records and permissions | Backend, exposed through reactive queries |
| Session and active organization | Auth integration and workspace provider |
| Current resource and navigation | Router and reference layer |
| Forms, selection, filters and panel state | Feature-local state, scoped stores or UI context |
| Device presentation preferences | Client-owned persistence, separate from shared workspace data |
| Layout slots and responsive composition | Shared shell primitives |
| Current assistant screen description | AI context provider and publishing feature |

Feature hooks own subscriptions, pagination and mutation/action adapters. Views
consume those results and expose loading, unavailable and failure states.
Backend-derived types keep the server contract authoritative. Transient stores
must not become a second copy of canonical domain data or permission policy.
During an organization switch, the client and server session can temporarily
report different active organizations. The workspace pauses its old subscriptions
before switching and resumes under the confirmed session scope. Remounting the
workspace then resets local state such as pagination cursors for the new group.

Writes flow through backend operations; subscribed views observe the resulting
state. Any optimistic presentation remains provisional until server acceptance.
Local reactive updates do not establish an offline synchronization protocol
between independent backends.

## Shared presentation and screen context

`packages/ui` provides reusable controls and layout primitives. Its shell
components describe layout composition; Groam's workspace shell owns product
navigation and global application behavior. `packages/ai` supplies AI context,
conversation and execution presentation shared across feature surfaces.

A feature publishes a serializable description of the current screen: purpose,
visible data, relevant resource and capabilities. The context provider selects
the active registration, and assistant orchestration persists or passes that
snapshot as appropriate. This makes a screen understandable to an agent without
coupling agent definitions to every route or component. Screen context is
informational; the backend still resolves resources and authorization.

## Source anchors

- [Application root](../../apps/web/src/app-root.tsx) and [workspace route](../../apps/web/src/routes/_workspace.tsx)
- [Workspace scope](../../apps/web/src/features/workspace/workspace-shell/workspace-context.tsx)
- [Reference resolution](../../apps/web/src/features/workspace/workspace-shell/reference-provider.tsx)
- [Screen context provider](../../packages/ai/src/ui/context/agent-context.tsx)

Related: [Backend and data](backend-and-data.md), [AI contracts](ai-contracts.md).
