# ChatGPT Provider Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace usable provider keys with per-user ChatGPT plan authorization on supported installations, with an honest hosted availability boundary.
**Architecture:** Convex owns OAuth transactions, protected connection records, refresh leases, and the callback. Local installations use their already-running loopback HTTP listener. Shared hosted deployments remain unavailable without the separately approved plan-usage contract; no identity-only client is presented as plan authorization.
**Tech Stack:** TypeScript, Convex, React, AI SDK Responses adapter, jose.
**Spec:** docs/superpowers/specs/2026-10-16-chatgpt-provider-design.md

## Global Constraints

- Personal credentials only; no deployment or organization key fallback.
- OAuth secrets stay server-side and public queries return metadata only.
- Preserve unrelated user edits. No deployment or live billable tests.
- Eligible inference requires store=false and stream=true.

## Review Focus

- Replayed and expired callbacks fail before token exchange.
- Disconnect or account switch during refresh cannot restore stale tokens.
- Another Groam user cannot select or use a saved connection.
- Model catalog or scope failures cannot fall back to a developer API key.
- Hosted browser origins cannot be used to bypass loopback registration.

### Task 1: OAuth contract and storage

Files: packages/backend/ai/chatgpt/*; packages/backend/convex/modules/ai/chatgpt-*.ts; packages/backend/convex/modules/ai/schema.ts.
Interfaces: metadata-only status; begin returns authorizationUrl; callback consumes a one-time transaction; connection records are private.
- [x] Write failing protocol tests for URL/scopes, loopback eligibility, and token validation.
- [x] Implement authorization, discovery/JWKS verification, token parsing, and account model catalog helpers.
- [x] Implement indexed host, transaction, and connection storage with ownership checks and refresh compare-and-swap leases.
- [x] Verify protocol and real Convex authorization tests.

### Task 2: Authenticated routes and callback

Files: packages/backend/convex/routes/settings/ai/{get,connect,disconnect,select,models,acknowledge}.ts; packages/backend/convex/http.ts.
Interfaces: get exposes availability, connections, activeConnectionId, and planNoticeAcknowledged; authenticated actions handle connect, disconnect, and model refresh; mutations handle selecting an owned connection and acknowledging plan use.
- [x] Cover anonymous denial, metadata secrecy, consumed state, and ownership.
- [x] Wire the existing loopback HTTP listener to callback completion and a static safe result page.
- [x] Implement serialized refresh and remote revocation with local disconnect on failure.
- [x] Verify routes and token rotation without live credentials.

### Task 3: Sole provider and schema cleanup

Files: packages/backend/convex/modules/ai/provider.ts; packages/backend/ai/chatgpt/model.ts; packages/env; tooling/devkit; account cleanup.
Interfaces: configuredAssistantProvider(ctx, scope) resolves only the scope user’s active ChatGPT connection and authorized catalog model.
- [x] Cover missing ChatGPT credentials and account ownership.
- [x] Use the public Responses endpoint with a guarded fetch enforcing streaming and no response storage.
- [x] Delete the former providers, API-key schema/routes, synchronization shim, registry/IDs, and migration framework with its dependency, scripts, workflows, and runtime hooks.
- [x] Verify adapter request bodies, background user ownership, and package typechecks.

### Task 4: Settings and documentation

Files: apps/web/src/features/settings/hooks/use-ai-settings.ts; settings-panels/ai-settings.tsx; associated tests; README.md; backend/desktop setup documentation.
- [x] Replace provider/key UI with ChatGPT connection, account selection, model selection, reconnect/disconnect, and first-use acknowledgment.
- [x] Remove obsolete client OAuth/key state and tests; remove obsolete availability plumbing and update affected browser mocks.
- [x] Explain hosted approval requirements and local callback reachability.
- [x] Run relevant tests, typechecks, lint/conventions, then the full quality gate where available.

## Execution notes

The user explicitly requested full implementation after reviewing the proposal. Continue implementation without another approval handoff. The user’s instruction to use their users’ OAuth grants overrides API-key provisioning workflow. No API key is needed or used.

Validation record after the fresh-project cleanup: all 410 backend tests, all 23 focused settings tests, workspace typechecks, repository lint, and React Doctor pass. No active provider-key schema, registry, migration runner/dependency, or environment-sync shim references remain. The full gate is blocked by seven tests and two unresolved imports in concurrently edited trip UI code, outside this change. The earlier desktop authorization URL validation and local callback smoke checks passed. Real ChatGPT sign-in requires an eligible human account and was not performed.

Preview contract review: request normalization removes unsupported SDK parameters, uses developer messages, and namespaces local tools. Model middleware sets store=false before SDK history conversion to avoid remote item references. Native web search is retained where the account/model permits it.

Final review: no blocking findings. A transient failure verifying a newly rotated ID token may require reconnection; validation remains fail-closed. The unsupported allowed_tools selector combination is rejected before any network request.

User clarification: the project has never been used. The final implementation deletes old code and migration infrastructure outright; it does not retain backward compatibility layers.

Code cleanup review: account rows now take explicit props and share route-derived types. Credential invalidation uses one atomic mutation guarded by ownership, revision, and refresh lease. Refresh error handling preserves persistence failures. Independent review found no material issues. Latest verification: all 440 backend tests, 14 focused settings tests, workspace typechecks, formatting, lint, and conventions pass. The full gate still reports seven failures in four concurrently edited trip/idea test files.

PR isolation verification: transferred only the ChatGPT diff onto origin/main, excluding the five prior branch commits and all concurrent trip/issue/idea edits. Generated contracts are synchronized. The isolated branch passes the complete `vp run check` gate (37/37 tasks), including all tests, workspace typechecks, lint, React Doctor, and Fallow.
