# New-user Demo Group Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give each new account a private, editable Demo group with travel planning and agent work examples.

**Architecture:** A Better Auth user creation trigger creates the organization, membership, and bounded domain data in one transaction. A durable per-user marker prevents recreation. Server-bound workspace context lets existing domain writes run before the first session exists; terminal agent fixtures never launch workflows.

**Tech Stack:** TypeScript, Convex, Better Auth, native Convex Agent threads, convex-test, Vite+.

**Spec:** docs/superpowers/specs/2026-10-26-new-user-demo-design.md

## Global Constraints

- Private Demo group, no fake users, existing accounts unchanged.
- Local seed endpoints remain local-only; no quota resets, AI calls, checkout, or external lookups.
- Repeated signup initialization and subsequent logins never overwrite edits or restore deleted data.
- All agent output is explicitly an example; seed only terminal runs.
- PR delivery only; no merge or production deployment.

## Review Focus

- Signup before a session exists: domain writes must use only the newly created owner's membership.
- Two independent accounts: no shared demo data or cross-account reads.
- Deleting/renaming examples: completion identity cannot depend on mutable group names.
- Agent seed records: no scheduled model work, valid relations, honest reports, readable native chat history.
- Existing fixtures and invitation entry: explicit real-group activation must still win.

### Task 1: Transactional signup initialization

**Files:** Create `packages/backend/convex/modules/onboarding/{schema,index,index.test}.ts`; modify root schema, auth trigger, and workspace roster support.

**Interfaces:** Internal-only `initialize({ userId: string })` loads the authoritative Better Auth user and returns `null`. The user-creation trigger calls it; direct internal invocation supports idempotency and rollback verification. A per-user indexed completion table stores the created organization ID.

- [x] Write signup tests using `createTestUser`: one private Demo group, distinct groups per account, explicit owner membership, no repeat initialization after rename/deletion,.
- [x] Run the focused backend test and observe missing demo behavior.
- [x] Implement the hook and atomic organization/membership creation with a durable completion marker. Use a server-only roster snapshot for pre-session domain writes.
- [x] Run focused tests and auth integration tests; retain deliberate no-group coverage in test fixtures.

### Task 2: Travel and agent examples

**Files:** Create `modules/onboarding/{trip,planning,agents}.ts` and extend onboarding tests; change shared domain helpers only if necessary.

**Interfaces:** `seedDemoContent(ctx: MutationCtx & { workspace: Workspace }): Promise<void>` creates one compact trip and related examples. Per-domain seed helpers take the bound trip context and typed IDs. Terminal agent fixture writes use normal indexed run and event tables and native Agent message storage.

- [x] Assert actual itinerary, packing, research, issue, idea, agent run details and chat history through product queries; assert unauthorized access fails and no workflow is queued.
- [x] Run tests and observe missing content assertions.
- [x] Populate one coherent trip with relative/undated scheduling, sample costs, an idea with real changes, linked research, issue-agent assignment/history, reviewer feedback, researcher report, Groam chat example and poll where supported.
- [x] Keep fixture attribution explicit and avoid normal AI-start routes; use standard domain writes wherever they do not start models.
- [x] Verify all four agents have readable terminal example work, the owner can edit examples without checkout, and native chat belongs only to the owner.

### Task 3: Compatibility, verification and PR

**Files:** Update backend/testing fixtures and affected auth tests only as failures show assumptions; update `packages/backend/convex/README.md`.

**Interfaces:** Existing test helpers keep their prior explicit-group and no-active-group contracts; signup itself always creates the demo membership.

- [x] Run backend suite, relevant web activation tests, conventions, formatting and typechecks; fix real regressions while retaining new-signup coverage.
- [x] Test group deletion and sign-in, invitation activation and transaction rollback through real component/domain behavior; inspect seed CLI selection by exact group name.
- [x] Run `just check` inside the worktree dev container and record actual results, including environmental failures.
- [x] Request independent review of the complete diff; resolve substantive findings with focused regression tests.
- [x] Commit with hooks intact, push the feature branch, open the PR, register its URL with T3, and report validation and limitations.
