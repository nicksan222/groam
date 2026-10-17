# Polls and Agent Waits Implementation Plan

> **For agentic workers:** Execute chunk by chunk. After each chunk, two independent review subagents check it, fixes land, then the next chunk starts. Steps use checkbox (`- [ ]`) syntax. Leave every change unstaged; never commit.

**Goal:** Groups decide together through polls, and any agent run can suspend on a durable wait (poll, timer, issue, proposal, RSVP) and resume in the same run when the condition is met or its deadline passes.

**Architecture:** Every agent run becomes one `@convex-dev/workflow` workflow (`agentRun`) whose frozen body loops `turn` action → optional `awaitEvent`. A waits module owns `agentWaits`, a per-kind condition registry, and the bridge to workflow events; domain writes (polls, issues, proposals, RSVPs) call `AgentWaits.signal` in their own transaction. Polls are a plain domain module with public routes and feature UI.

**Tech Stack:** Convex 1.46, `@convex-dev/workflow` 0.4.10 (+ `@convex-dev/workpool` peer), `@convex-dev/agent` 0.7.3, AI SDK 7, convex-test 0.0.60, React 19 + TanStack Router, Vite+ (`vp test` browser mode), Oxlint/Oxfmt.

**Spec:** `docs/superpowers/specs/2026-10-17-polls-agent-waits-design.md`

---

## Global Constraints

- `MAX_TURNS = 25`; the `agentRun` body never changes after Chunk 1 ships (replay determinism).
- Workflow steps take and return ids and small outcome objects only; no message text in the journal (1 MB step data, 8 MiB journal).
- Wait deadline is required, must be in the future, and at most 14 days (`14 * 24 * 60 * 60 * 1000` ms) after creation.
- One active wait per run (`agentRuns.activeWaitId`).
- Wait kinds: `timer`, `poll`, `issue`, `proposal`, `rsvp`. Wait statuses: `waiting | met | expired | cancelled`. Resolve reasons: `met | deadline | cancelled`.
- Poll options: 2–10, each label 1–80 chars after trim; question 1–200 chars; `closesAt` optional, future, at most 14 days out.
- Poll rule: non-empty any-of list of `allVoted`, `quorum { count }`, `quorum { percent }` (1–100), `optionVotes { min }`, `optionVotes { majority: true }`, `closed`.
- Agent run statuses after Chunk 2: `queued | running | waiting | complete | failed | aborted`.
- Resume note format: `Wait met: <summary>` / `Wait expired: <summary>` / `Wait cancelled: <summary>`.
- Missing/invalid ChatGPT connection on resume: run fails, event label `Reconnect ChatGPT to continue`.
- Legacy runs still `queued`/`running` without `workflowId` at deploy: failed with error `Interrupted by upgrade`.
- Public Convex functions live in `packages/backend/convex/routes/<domain>/<op>.ts` and export only `run`; handlers are thin and call a module facade.
- Use builders (`workspaceQuery`, `workspaceMutation`, `tripQuery`, `sharedTripQuery`, internal twins); scheduled work uses raw `internalMutation`/`internalAction` in a module.
- `'use node'` files never touch `ctx.db`; no file in this plan uses `'use node'`.
- `ctx.db` only in `convex/components/`, `convex/modules/`, `convex/routes/`.
- File and folder names kebab-case; imports through package aliases (`#convex/*`, `#convex-generated/*`, `#backend/*`, `#testing/*`, `#ai/*`, `@/features/*`, `@groam/*`), never `../`.
- UI uses semantic color tokens only (`text-primary`, `bg-muted`, `border-destructive/30`, …) and `@groam/ui/components/*` / `@groam/ui/lib/*` public entrypoints.
- Feature `.tsx` files: one exported component per file, under 300 lines; functions under 250 lines.
- Test ids live in `tooling/app-actions/src/testing/ids.ts` (alphabetical, kebab-case values) and are read through `testIds` / `ids`.
- Backend tests use the shared `#testing/factory` / `#testing/trips` factory (`createTest` registers Better Auth, Agent, Geospatial, Rate Limiter, and, after Task 1.1, Workflow); drive public `api.routes.*.run`; never mock procedures, auth, or components; model doubles only via `mockModel` + `vi.spyOn(AssistantProvider, 'configured')`.
- Raw Convex CLI commands carry `CONVEX_AGENT_MODE=anonymous`.
- Tests: `vp test` (backend `cd packages/backend && vp test run <file>`; ai `cd packages/ai && vp test run <file>`; web `cd apps/web && vp test run --project views <file>` / `--project unit`); format+lint `vp check`; full gate `just check`.
- Dependencies are added to `packages/backend/package.json` and installed with `vp install` (never ad hoc).

## Spec deviations

1. **Run actor (`asRun`).** Workflow steps run with no auth identity, but every assistant tool calls internal functions that resolve the caller with `requireWorkspace(ctx)`. To make "a turn runs as `run.createdBy`" true, internal builders (`internalWorkspace*`, `internalTrip*`, `internalMutableTripMutation`, `internalShared*`, `internalDestinationMutation`) accept an optional `asRun: Id<'agentRuns'>`; with no identity they build the creator's `Workspace` from the run (run must be `running`, creator must still be an org member). Tools get `asRun` injected by one wrapper in `createRegisteredAssistantTools`, not per tool. `requireWorkspace(ctx)` returns a workspace already bound on `ctx` (builder or trip ctx) before reading identity.
2. **Turn step retries are off** (`retry: false`). A turn streams messages and runs write tools; retrying it would duplicate writes. Crashes and timeouts reach `onComplete` as failures and fail the run with `The run stopped responding. Try again.` (today's sweep copy).
3. **Queued-run expiry without a cron.** `sweepStaleRuns` is removed, but a discussion run queued by `send` whose client never calls `respond` would stay queued forever. `queueDiscussionTurn` schedules `engine.functions.expireQueued` 10 minutes out (one scheduled function per queued run; no scan). Same copy as today.
4. **`organizationId` instead of `workspaceId`** on `agentWaits` and `polls` (repo-wide field name; indexes renamed accordingly: `by_organizationId_and_status`).
5. **Extra persisted fields.** `agentRuns`: `actorTokenIdentifier`, `screen`, `promptMessageId`, `discussionUpdatedAt` (all optional), needed because the turn no longer receives them from a client action. `polls.createdBy` carries a `kind` discriminator and display `name`.
6. **Extra route and route paths.** Kebab-case files force `routes/polls/list/{trip,workspace,discussion}.ts` (`api.routes.polls.list.trip.run`, …) for spec's `listByTrip`/`listByWorkspace`; `list/discussion` is added to render linked polls inline.
7. **Trip poll eligibility** uses the trip's traveler list as shown (`TripTravelers` roster overlay: current org members, accounts only, default RSVP `going`) minus travelers whose RSVP is `not_going`, instead of raw `tripTravelers` rows: members who joined after the trip was created have no row yet but are listed as going, departed members' leftover rows must not count, and invited people without accounts never appear. Discussion-linked polls further intersect with discussion members when the discussion audience is `members`.
8. **Journey.** Journeys run the real app without a scripted model, so "an agent creates a poll" cannot run there. The agent path is covered by a convex-test end-to-end (`modules/polls/poll-agent.test.ts`: mock model calls `createPoll` with `waitFor`, travelers vote through public routes, workflow resumes, follow-up posted). The journey covers the human path (create, vote, tally, close).
9. **Standalone resume** keeps `saveMessages: 'none'`; a resumed standalone turn rebuilds its prompt from the original task plus the resume note and the run's last report.
10. **Client entry points become mutations.** `routes/discussions/messages/respond.ts` and `routes/agents/runs/start.ts` change from actions to mutations; web hooks switch `useAction` → `useMutation`.
11. **Banner cancel** resolves the wait with `cancelled` (the run resumes and wraps up); the existing Stop button still stops the whole run.
12. **Proposal `approved`** = proposal `merged`, or stored approval rows ≥ `requiredApprovals` (approvals are only inserted for eligible reviewers). **RSVP `allResponded`** = no `tripTravelers` row on the trip still has status `invited` (seeded rows default to `going`).
13. **`createPoll`, `waitFor`, and `cancelWait` skip the write-intent gate** (spec decision for `createPoll`; the wait tools only control the agent's own run). They are declared as specs without `writeIntent` plus `eventLabel`, which the `add-agent-capability` skill otherwise forbids for writes.
14. **Legacy migration** is a one-off internal mutation run by the deployer: `CONVEX_AGENT_MODE=anonymous vp exec convex run modules/assistant/engine/migrations:failLegacyRuns`.
15. **Scheduled standalone runs gain tool access.** Today a server-scheduled standalone run has no identity, so trip tools fail; with the run actor they work.
16. **Stale sweep kept for runs no workflow owns.** `sweepStaleRuns` stays on its 5-minute cron but only reads runs without `workflowId` (index `by_status_and_workflowId_and_updatedAt`): pre-workflow runs, inline manual idea reviews, and chat turns queued by `send` that no client responded to (running idle >15 min, queued idle >10 min). This replaces the `failLegacyRuns` migration and `expireQueued`. Workflow runs, and the Chunk 2 `waiting` status, are never swept.
17. **Route shims.** `routes/discussions/messages/respond.ts` and `routes/agents/runs/start.ts` stay public actions at the same paths (shipped clients call them); each calls an internal mutation (`discussions.assistant.index.respond`, `assistant.engine.functions.startStandalone`) that holds the new logic. Web hooks keep `useAction`. This supersedes item 10.
18. **Manual idea review runs inline.** `versions/agent/review/action` claims and finishes its run in the action (`AgentTurns.runInline`), never through a workflow, and only claims a queued run with no `workflowId`; `AgentEngine.start` never takes a running standalone run. While an automatic review is queued, a manual review returns "in progress".
19. **Stale chat re-claim.** Claiming a prompt again after its claim went stale aborts the earlier run and cancels its workflow, after the new run exists, so the cancelled run's `onComplete` sees it was superseded and leaves the request to the new run. `onComplete` always ends with an idempotent `AgentRuns.finish`.
20. **Rollback is forward-only.** Keep the new optional `agentRuns` fields and the `workflow` component mount; unmounting the component orphans its data and in-flight runs.
21. **Workflow body unchanged in Chunk 2.** The Chunk 1 body already had the `awaitEvent` branch, so `workflow.ts` and its frozen hash are untouched; the resume journal is `function, event, function`.
22. **`routes/agents/waits/run` returns only a pending wait** (null once resolved), so the banner never shows a stale wait between resolution and the next claim.
23. **Banner copy split.** The activity line reads `Waiting for <label>`; `AgentRunWait` shows only progress, deadline, and Cancel (no duplicate label). `agentRunCopy.waitingFor`/`cancelWait` live in `backend/runs/events.ts`, where `agentRunCopy` is defined (`copy.ts` re-exports it). No `./ui/runs/agent-run-wait` package export: apps only need the banner.
24. **Web status maps.** `agent-run-status-badge.tsx` and `agent-run-outcome.tsx` gain a `waiting` entry ("Agent is waiting", hourglass). The run log's live indicator stays on `queued|running`; `assistant-run-card.tsx` was left alone (unrelated uncommitted edits).
25. **`AgentWaits.resolve` takes an options object** (`{ evaluation, notify, reason }`, lint `max-params`). `waits.test.ts` parks its idle workflow on `awaitEvent` instead of `sleep`, so cancelling it leaves no late step completion.
26. **Extra Chunk 2 tests.** `resume.test.ts` also covers a chat turn that waits (request completes, run resumes in the same thread with a hidden system note) and that `failStaleRuns` never sweeps a `waiting` run; `waits.test.ts` covers cancel-after-expiry and expiry-after-cancel no-ops; `routes.test.ts` covers the discussion route and outsider denial.
27. **Turn reserve.** `agentRuns.turns` (optional) counts claimed turns, including the current one; `AgentWaits.create` refuses once `turns >= MAX_TURNS`, so a waiting run always has a workflow turn left to resume. The workflow body is unchanged.
28. **Resumed chat replies.** `suspend` answers the original request; the resumed turn has no request, so `onComplete` posts its report as the chat's `lastMessage` (`Discussions.recordAssistantReply`), guarded by `discussionUpdatedAt`, which `claimTurn` refreshes on `waiting → running`.
29. **Cascades.** `Discussions.purge` (and so trip/org cleanup) first aborts every queued, running, or waiting run in the chat (`AgentRuns.abortAllForDiscussion`); trip deletion aborts an issue's active run before deleting the issue. Aborting cancels the wait without resuming.
30. **`signal` pages.** A full batch schedules `waits.functions.signal` with the page cursor, so every waiting wait on a ref is evaluated.
31. **Banner.** `AgentWaitView` carries `agentId` (label and link); the discussion wait banner wires Stop; `AgentRunBanner` shows Stop only when `onStop` is passed. Standalone turns that end in a wait log no "Report ready" and store no fallback report; a resumed prompt omits an empty "Your report so far".
32. **Tool tests in CI.** `packages/backend/vite.config.ts` includes `assistant/**/*.test.ts` (they were never run before).
33. **Poll deletion.** `routes/polls/remove.ts` (creator, run starter, or group admin; same rule as close, so `canClose` is `canManage`). `modules/polls/cleanup.ts` (`PollCleanup`, a leaf importing only `AgentWaits`) signals `{ deleted: true }` before deleting votes and the poll, so waits resolve `cancelled` with `Cancelled: the watched poll was deleted` and the final tally. Cascades: trip deletion (`deleteConversationAndIssueRows`), `Discussions.purge`, and organization cleanup purge polls in batches of at most 10.
34. **Private chats.** Eligibility in an `owner`-audience (assistant) chat is the owner only; `createPoll` from a private assistant chat does not attach the chat and falls back to the active trip, the run's trip, then the group.
35. **Test helpers.** The idle test workflow is exported by `modules/polls/poll-waits.test.ts` (convex-test only finds functions under `convex/`, and referencing `waits.test.ts` re-registers its tests). `#testing/polls` adds `insertAgentRun(trip, fields, workflow?)`; `pollWaitRun(trip, pollId, rule, { deadlineAt?, discussionId?, tripId? })`. `poll-scope.test.ts` covers chat/trip/group scope, agent-poll management, and `createPoll` placement.
36. **UI lint fixes.** `PollOptionButton` renders `Button unstyled` (no native buttons); create-dialog option rows carry stable ids (no index keys); `ActiveTripSection`'s shared-tab switch moved to `sharedTripSection`, and `use-trip-agent-context` gained `liveTripId` (cognitive complexity). Hooks reuse `attempt`/`attemptValue` from `@/lib/errors`. The Polls tab sits after Ideas.
37. **Journey.** `decide-with-a-trip-poll` skips `arrange.account()` (the research journey pattern), asserts `0 of`/`1 of` since the arranged group size is not fixed, and was written but not run (needs the live backend).
38. **RSVP changes do not signal poll waits** in Chunk 3; a traveler switching to `not_going` changes eligibility, which is picked up on the next vote, retract, close, or the deadline. Chunk 4's RSVP `signal` site should also signal the trip's open polls.
39. **Review fixes.** `WaitScope.viewer` (the run creator, role from Better Auth) and the poll condition validates through `readablePoll`. Lists: `list/trip` and `list/workspace` take `{ status, paginationOpts }` and return a pagination result (`by_organizationId_and_tripId_and_status` keeps trip polls out of the group list); `list/discussion` stays bounded at 50. `voterLoader` memoizes the roster and trip statuses per call. Vote, retract, and close refuse on an archived trip; an explicit `tripId` must equal the chat's trip. Web: `useTripPolls` pages open then closed polls ("Show older polls"); `usePollSelection` holds the pending selection (`aria-busy`) so quick multi-select clicks keep every choice; the `/poll` dialog lives in `ChatPollDialog` driven by `lib/stores/poll-dialog-store`; the card shows why a viewer cannot vote, `Closes …`, and polite live progress; the dialog flags case-only duplicate options; `poll.create` is not offered on archived trips.
40. **Chunk 4 signals.** `AgentWaits.signal` batches with `take` and continues from the last wait's `_creationTime` (`waits.functions.signal` takes `after`, not a `paginate` cursor): one transaction signals several entities (trip deletion, open polls), and Convex allows one paginated query per function. Conditions split into `load` (reads only what `refId` names) and `judge` (applies one wait's rule), so a signal batch loads once (`evaluateSameRef`) and shares a per-signal memo (one `voterLoader`/roster across polls). Issue, idea (`setApproval`, `finishAgentReview`, `finishMerge`, `close`), and trip-deletion signals run inline. RSVP and membership re-checks are scheduled so the RSVP/join/leave write never pays for them: `setTravelerStatus` (and so `setTravelerRsvp`) and `claimInvitation` schedule `polls.functions.signalTravelers` (the trip's `rsvp` waits plus its open polls' waits, 20 polls per batch, continued by `signalOpen`); `issues/resync.trip` schedules the same after its condition sync; `resync.organization` schedules `signalOpen` for the group's own polls. Each schedule first checks `agentWaits.by_organizationId_and_status_and_kind` and skips when the group has no pending poll/RSVP wait (also keeps convex-test setups, whose trigger-scheduled jobs never settle under real timers, free of new jobs). Discussion-member rows only change at chat creation, trip-audience participation (not eligibility), member departure (covered by the roster signal), and purge (polls purged), so no extra discussion signal exists. Trip deletion signals `issue`/`proposal` (deleted) before their rows go and `rsvp` (deleted) before the trip row; `PollCleanup` covers polls. Known gap: archived trips are not re-checked on membership change.
41. **Chunk 4 semantics.** `issue`, `proposal`, and `rsvp` validate through `findVisibleTrip(…, scope.viewer)` (the run creator). `proposal` counts approvals with `countedApprovals`/`eligibleReviewers` (moved to the leaf `travel/versions/quorum.ts`, used by `assertMergeReady`/`reviewState` too) against the live roster, and `approved` needs status `in_review` (or `merged`); this supersedes item 12's raw count. `rsvp` drops `allResponded` (no flow creates `invited` rows today): the rule is `{ going: n }`, members without an RSVP row count as going (as for poll eligibility), and an idea working copy is refused. Wait `outcome.snapshot` is optional: deletion snapshots keep the final state; a run that ends (`notify: false`) closes its wait without reading the entity, and a failed read on other cancels still resolves. An undeliverable wait event (`sendEvent` throws only when the event/step is gone or already used) fails the run with `The run could not resume after its wait. Try again.` and cancels its workflow. `assertCanControl` treats only an invisible trip as no admin; other trip-load errors surface.
42. **Chunk 4 tests.** `domain-waits.test.ts` (issue, idea incl. agent approval, RSVP, claim, deletion) and `roster-waits.test.ts` (join/leave re-checks under fake time via `#testing/waits` `inFakeTime`, many open polls, departed reviewer, denials incl. another group's run on an idea) each export their own `idle`; `#testing/waits` holds `waitHelpers`, `submitIdea` (stops the automatic review), and `removeMember`.

## Review Focus

Each item names the test that must exist and pass; reviewers read that test, not just its name.

1. **Workflow replay determinism across deploy.** A changed `agentRun` body fails in-flight runs. → Task 1.9 `engine/workflow.test.ts`: `frozen agentRun body` (sha256 of `workflow.ts` equals the committed constant), and Task 2.4 `engine/resume.test.ts`: `a timer wait suspends the run and its deadline resumes the same run` asserts the journal kinds are exactly `function, event, function` (via `listSteps`).
2. **Concurrent votes resolving the same wait twice.** → Task 3.3 `modules/polls/poll-waits.test.ts`: `two votes that both meet the rule resolve the wait once` (parallel `vote` calls; one `met` row, `resolvedAt` set once, exactly two `turn` steps in the journal).
3. **Resume when the creator's ChatGPT connection is invalid.** → Task 2.4 `engine/resume.test.ts`: `a resume with a disconnected ChatGPT fails the run with a reconnect event`.
4. **Trip traveler without an account.** → Task 3.3 `poll-waits.test.ts`: `invited travelers without an account are neither eligible nor counted` (an `invited` row with no `userId` does not block `allVoted`, and `eligible` excludes it).
5. **Deadline fires after the poll condition was already met.** → Task 3.3 `poll-waits.test.ts`: `a deadline after the rule was met is a no-op` (status stays `met`, outcome reason stays `met`, no error from a second `sendEvent`).

---

## Chunk 1: Run engine on `@convex-dev/workflow`, behavior unchanged

### Task 1.1: Install and register the workflow component

**Files:**
- Modify: `packages/backend/package.json` (dependencies)
- Modify: `packages/backend/convex/convex.config.ts`
- Modify: `packages/backend/testing/factory.ts:1-66`
- Create: `packages/backend/testing/workflows.ts`

**Interfaces:**
- Produces: `components.workflow` (generated), `createTest()` registering `workflow`, `runUntil(test, predicate, timeoutMs?)`.

- [ ] **Step 1: Add dependencies.** In `packages/backend/package.json` `dependencies`, add (alphabetical):

```json
"@convex-dev/workflow": "^0.4.10",
"@convex-dev/workpool": "^0.4.13",
```

and bump `"convex-helpers": "^0.1.127"` (workflow peer). Then run `cd /workspaces/groam && vp install`. `@convex-dev/agent@0.7.3` lists workflow only as a devDependency, so there is no version pin to reconcile.

- [ ] **Step 2: Mount the component.** `packages/backend/convex/convex.config.ts`:

```ts
import agent from '@convex-dev/agent/convex.config';
import geospatial from '@convex-dev/geospatial/convex.config.js';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
import staticHosting from '@convex-dev/static-hosting/convex.config';
import workflow from '@convex-dev/workflow/convex.config.js';
// …
app.use(rateLimiter);
app.use(workflow);
app.use(staticHosting, { name: 'web' });
```

- [ ] **Step 3: Register in tests.** `packages/backend/testing/factory.ts`:

```ts
import { register as registerWorkflow } from '@convex-dev/workflow/test';
// …
export function createTest() {
  const test = convexTest(schema, appModules);
  registerBetterAuth(test);
  registerAgent(test);
  registerGeospatial(test);
  registerRateLimiter(test);
  registerWorkflow(test);
  return test;
}
```

- [ ] **Step 4: Settling helper.** Create `packages/backend/testing/workflows.ts`:

```ts
import type { createTest } from '#testing/factory';

/**
 * Workflows advance through scheduled functions. With real timers convex-test runs them on its
 * own; this polls until `predicate` holds. Deadlines hours away never fire inside the window, so
 * deadline tests call the expiry mutation directly.
 */
export async function runUntil(
  test: ReturnType<typeof createTest>,
  predicate: () => Promise<boolean>,
  timeoutMs = 10_000
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await test.finishInProgressScheduledFunctions();
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Workflow did not settle in time');
}
```

- [ ] **Step 5: Codegen and typecheck.**

Run: `cd /workspaces/groam && just codegen && cd packages/backend && vp run typecheck`
Expected: PASS; `_generated/api.d.ts` contains `workflow:`.

---

### Task 1.2: Persist what a turn needs on the run

**Files:**
- Modify: `packages/backend/convex/modules/assistant/runs/schema.ts:118-152` (table), `:26-47` (view unchanged)
- Modify: `packages/backend/convex/modules/assistant/runs/index.ts:354-490` (`queueIssueRun`, `queueDiscussionTurn`, `claimDiscussionTurn`, `queueReviewRun`)

**Interfaces:**
- Produces: `agentRuns` optional fields `workflowId: string`, `actorTokenIdentifier: string`, `screen: AssistantScreen`, `promptMessageId: string`, `discussionUpdatedAt: number`; `queue*`/`claimDiscussionTurn` args gain `actorTokenIdentifier?: string`; `claimDiscussionTurn` args gain `screen: AssistantScreen; promptMessageId: string; discussionUpdatedAt: number`.

- [ ] **Step 1: Failing test.** Append to `packages/backend/convex/modules/assistant/runs/runs.test.ts`:

```ts
test('a claimed discussion turn stores its actor, screen, and prompt for the workflow', async () => {
  const { owner } = await setupTrip(0);
  const organizationId = owner.organizationId as string;
  const runId = await owner.test.run(async (ctx) => {
    const discussionId = await ctx.db.insert('discussions', {
      shortId: 'actr0001',
      clientRequestId: 'req-actor',
      createdBy: { name: 'Owner', userId: owner.userId },
      kind: 'group',
      members: [],
      organizationId,
      threadId: 'thread-actor',
      title: 'Plans',
      updatedAt: 1
    });
    return await AgentRuns.claimDiscussionTurn(ctx, {
      actorTokenIdentifier: 'issuer|owner',
      agentId: 'groam',
      createdBy: { name: 'Owner', userId: owner.userId },
      discussionId,
      discussionUpdatedAt: 1,
      organizationId,
      promptMessageId: 'msg-1',
      screen: {
        capabilities: [],
        data: '{}',
        description: 'Chat',
        key: 'chat:x',
        target: { kind: 'workspace' },
        title: 'Chat'
      },
      threadId: 'thread-actor',
      title: 'Plans'
    });
  });
  await owner.test.run(async (ctx) => {
    expect(await ctx.db.get('agentRuns', runId)).toMatchObject({
      actorTokenIdentifier: 'issuer|owner',
      discussionUpdatedAt: 1,
      promptMessageId: 'msg-1',
      screen: { key: 'chat:x' },
      status: 'running'
    });
  });
});
```

- [ ] **Step 2: Run, expect fail.**
Run: `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant/runs/runs.test.ts -t "stores its actor"`
Expected: FAIL (type error / unknown field `actorTokenIdentifier`).

- [ ] **Step 3: Schema.** In `assistantRunTables.agentRuns` add (keep alphabetical inside the object):

```ts
    /** Better Auth token identifier of `createdBy`; the run actor's agent-thread user id. */
    actorTokenIdentifier: v.optional(v.string()),
    /** Discussion `updatedAt` at claim time, so the finish skips a stale last-message preview. */
    discussionUpdatedAt: v.optional(v.number()),
    /** The discussion message the chat turn answers. */
    promptMessageId: v.optional(v.string()),
    /** Screen context the turn runs against (chat only). */
    screen: v.optional(assistantScreenValidator),
    /** `@convex-dev/workflow` id; set when the engine starts the run. */
    workflowId: v.optional(v.string()),
```

Import `assistantScreenValidator` from `#convex/modules/assistant/validators/index`.

- [ ] **Step 4: Writers.** In `runs/index.ts`:
  - `queueIssueRun` / `queueReviewRun` args: add `actorTokenIdentifier?: string`; insert `...(args.actorTokenIdentifier ? { actorTokenIdentifier: args.actorTokenIdentifier } : {})`.
  - `claimDiscussionTurn` args: add `actorTokenIdentifier: string; discussionUpdatedAt: number; promptMessageId: string; screen: AssistantScreen`. Both branches (patching the queued run and inserting) write `actorTokenIdentifier`, `discussionUpdatedAt`, `promptMessageId`, `screen`.
- [ ] **Step 5: Callers.** `Discussions.claimAssistantResponse` (`modules/discussions/threads/index.ts:624-671`) gains a `screen: AssistantScreen` parameter and passes `actorTokenIdentifier: workspace.tokenIdentifier, discussionUpdatedAt: discussion.updatedAt, promptMessageId, screen`. `claimResponse` in `modules/discussions/assistant/index.ts` adds `screen: assistantScreenValidator` to its args (tests in `threads.test.ts` that call it pass the `workspaceScreen` constant; add it there). `setAssignee`/`createAssignedToIssueAgent`/`retryIssueRun`/`queueIdeaReviewerRun` pass `actorTokenIdentifier` when a viewer workspace is at hand (`trip.workspace.tokenIdentifier`, `workspace.tokenIdentifier`); `queueIdeaReviewerRun` passes nothing (author is not the caller).
- [ ] **Step 6: Run, expect pass.** Same command → PASS. Then `vp test run convex/modules/discussions/threads/threads.test.ts` → PASS.

---

### Task 1.3: Run actor — internal functions act for the run's creator

**Files:**
- Modify: `packages/backend/convex/modules/auth/workspace.ts:43-201`
- Create: `packages/backend/convex/modules/auth/actor.ts`
- Modify: `packages/backend/convex/modules/travel/trips/ctx.ts:245-345`
- Modify: `packages/backend/convex/modules/assistant/model/index.ts:64-200` (`access`, `taggedContext`, `setScreenContext`, `setContextTags`)
- Modify: `packages/backend/convex/modules/discussions/research/tools.ts` (all seven exports)
- Create: `packages/backend/convex/modules/auth/actor.test.ts`

**Interfaces:**
- Produces (from `#convex/modules/auth/workspace`):
  - `type Workspace = { organizationId; organizationRole; tokenIdentifier; userId; viewerName; runId?: Id<'agentRuns'> }`
  - `const runActorArgs: { asRun: VOptional<VId<Id<'agentRuns'>>> }`
  - `function requireActor(ctx: WorkspaceFunctionCtx, asRun?: Id<'agentRuns'>): Promise<Workspace>`
  - `function systemRoster(ctx: WorkspaceFunctionCtx, organizationId: string): Promise<OrganizationRoster>` (now exported)
  - internal builders accept `asRun` automatically.
- Produces: `internal.modules.auth.actor.load` (`internalQuery`, args `{ runId }`, returns `RunActor | null`).

- [ ] **Step 1: Failing tests.** Create `packages/backend/convex/modules/auth/actor.test.ts`:

```ts
import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { setupTrip } from '#testing/trips';

async function runningRun(status: 'running' | 'complete' = 'running') {
  const trip = await setupTrip(1);
  const runId = await trip.owner.test.run(async (ctx) =>
    ctx.db.insert('agentRuns', {
      actorTokenIdentifier: 'issuer|owner',
      agentId: 'groam',
      createdBy: { name: 'Owner', userId: trip.owner.userId },
      kickoff: 'assign',
      organizationId: trip.owner.organizationId as string,
      shortId: 'actor001',
      status,
      surface: 'chat',
      title: 'Actor',
      updatedAt: Date.now()
    })
  );
  return { ...trip, runId };
}

test('an internal trip query acts for the creator of a running run without identity', async () => {
  const { owner, runId, tripId } = await runningRun();
  const context = await owner.test.query(internal.modules.assistant.model.index.tripContext, {
    asRun: runId,
    tripId
  });
  expect(context.tripName).toBeTruthy();
});

test('a finished run no longer acts for anyone', async () => {
  const { owner, runId, tripId } = await runningRun('complete');
  await expect(
    owner.test.query(internal.modules.assistant.model.index.tripContext, { asRun: runId, tripId })
  ).rejects.toThrow('Agent run is not active');
});

test('a creator removed from the group cannot be acted for', async () => {
  const { owner, runId, tripId } = await runningRun();
  await owner.test.run(async (ctx) => {
    const run = await ctx.db.get('agentRuns', runId);
    await ctx.db.patch('agentRuns', runId, {
      createdBy: { name: 'Gone', userId: 'user-not-in-group' },
      updatedAt: (run?.updatedAt ?? 0) + 1
    });
  });
  await expect(
    owner.test.query(internal.modules.assistant.model.index.tripContext, { asRun: runId, tripId })
  ).rejects.toThrow('Organization access denied');
});

test('a signed-in caller is resolved from identity even when asRun is passed', async () => {
  const { owner, runId, tripId, users } = await runningRun();
  const member = users[0];
  if (!member) throw new Error('Expected a member');
  const context = await member.client.query(internal.modules.assistant.model.index.tripContext, {
    asRun: runId,
    tripId
  });
  expect(context.tripName).toBeTruthy();
  await expect(
    owner.test.query(api.routes.trips.get.run, { tripId: tripId as Id<'trips'> })
  ).rejects.toThrow('Not authenticated');
});
```

- [ ] **Step 2: Run, expect fail.**
Run: `cd /workspaces/groam/packages/backend && vp test run convex/modules/auth/actor.test.ts`
Expected: FAIL (`asRun` is not a valid arg).

- [ ] **Step 3: `workspace.ts`.** Add near the top:

```ts
import { v } from 'convex/values';
import { components, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
```

Extend `Workspace` with `/** Set when an agent turn acts for its run's creator. */ runId?: Id<'agentRuns'>;`. Then:

```ts
export const runActorArgs = { asRun: v.optional(v.id('agentRuns')) };

export type RunActor = {
  organizationId: string;
  tokenIdentifier: string;
  userId: string;
  viewerName: string;
};

function isWorkspace(value: unknown): value is Workspace {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Workspace>;
  return (
    typeof candidate.organizationId === 'string' &&
    typeof candidate.userId === 'string' &&
    typeof candidate.tokenIdentifier === 'string'
  );
}

/** A workspace a builder or trip context already resolved for this same call. */
function boundWorkspace(ctx: WorkspaceFunctionCtx): Workspace | null {
  const candidate = (ctx as { workspace?: unknown }).workspace;
  return isWorkspace(candidate) ? candidate : null;
}

/** Reads the actor of a run that is mid-turn. Pure db read so queries and mutations share it. */
export async function loadRunActor(
  ctx: AuthContext,
  runId: Id<'agentRuns'>
): Promise<RunActor | null> {
  const run = await ctx.db.get('agentRuns', runId);
  if (!run || run.status !== 'running') return null;
  return {
    organizationId: run.organizationId,
    // Standalone runs created before Task 1.2 have no token; their thread user is the user id.
    tokenIdentifier: run.actorTokenIdentifier ?? run.createdBy.userId,
    userId: run.createdBy.userId,
    viewerName: run.createdBy.name
  };
}

async function runActorWorkspace(
  ctx: WorkspaceFunctionCtx,
  runId: Id<'agentRuns'>
): Promise<Workspace> {
  const actor =
    'db' in ctx
      ? await loadRunActor(ctx as AuthContext, runId)
      : await ctx.runQuery(internal.modules.auth.actor.load, { runId });
  if (!actor) throw new ConvexError('Agent run is not active');
  const member = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: 'member',
    select: ['role'],
    where: [
      { field: 'organizationId', value: actor.organizationId },
      { field: 'userId', value: actor.userId }
    ]
  })) as { role?: string } | null;
  if (!member?.role) throw new ConvexError('Organization access denied');
  return {
    organizationId: actor.organizationId,
    organizationRole: member.role,
    runId,
    tokenIdentifier: actor.tokenIdentifier,
    userId: actor.userId,
    viewerName: actor.viewerName
  };
}

/** Identity wins; with none, an active run's creator is the actor. */
export async function requireActor(
  ctx: WorkspaceFunctionCtx,
  asRun?: Id<'agentRuns'>
): Promise<Workspace> {
  if (asRun === undefined || (await ctx.auth.getUserIdentity()) !== null) {
    return await requireWorkspace(ctx);
  }
  return await runActorWorkspace(ctx, asRun);
}
```

At the start of `requireWorkspace` add `const bound = boundWorkspace(ctx); if (bound) return bound;`. Rename `async function systemRoster` → `export async function systemRoster`. In `workspaceRoster` change the first line to:

```ts
  if (workspace.tokenIdentifier === SYSTEM_TOKEN_IDENTIFIER || workspace.runId !== undefined) {
    return await systemRoster(ctx, workspace.organizationId);
  }
```

Replace the bottom builder block:

```ts
const workspaceCtx = customCtx(async (ctx: WorkspaceFunctionCtx) => ({
  workspace: await requireWorkspace(ctx)
}));

const actorWorkspaceCtx = {
  args: runActorArgs,
  input: async (ctx: WorkspaceFunctionCtx, { asRun }: { asRun?: Id<'agentRuns'> }) => ({
    args: {},
    ctx: { workspace: await requireActor(ctx, asRun) }
  })
};

export const workspaceQuery = customQuery(query, workspaceCtx);
export const workspaceMutation = customMutation(mutation, workspaceCtx);
export const workspaceAction = customAction(action, workspaceCtx);
export const internalWorkspaceQuery = customQuery(internalQuery, actorWorkspaceCtx);
export const internalWorkspaceMutation = customMutation(internalMutation, actorWorkspaceCtx);
export const internalWorkspaceAction = customAction(internalAction, actorWorkspaceCtx);
```

- [ ] **Step 4: `modules/auth/actor.ts`.**

```ts
import { v } from 'convex/values';
import { internalQuery } from '#convex-generated/server';
import { loadRunActor } from '#convex/modules/auth/workspace';

const runActor = v.object({
  organizationId: v.string(),
  tokenIdentifier: v.string(),
  userId: v.string(),
  viewerName: v.string()
});

/** Action-side lookup for `requireActor` (actions have no `ctx.db`). */
export const load = internalQuery({
  args: { runId: v.id('agentRuns') },
  returns: v.union(runActor, v.null()),
  handler: (ctx, { runId }) => loadRunActor(ctx, runId)
});
```

- [ ] **Step 5: Trip builders.** In `travel/trips/ctx.ts` import `requireActor, runActorArgs` and replace the internal twins:

```ts
const internalTripIdArgs = { ...tripIdArgs, ...runActorArgs };

async function actorTripInput(ctx: QueryCtx | MutationCtx, tripId: Id<'trips'>, asRun?: Id<'agentRuns'>) {
  return { args: {}, ctx: boundTrip(await loadTripContext(ctx, tripId, await requireActor(ctx, asRun))) };
}

export const internalTripQuery = customQuery(internalQuery, {
  args: internalTripIdArgs,
  input: async (ctx, { asRun, tripId }) => await actorTripInput(ctx, tripId, asRun)
});
export const internalTripMutation = customMutation(internalMutation, {
  args: internalTripIdArgs,
  input: async (ctx, { asRun, tripId }) => await actorTripInput(ctx, tripId, asRun)
});
export const internalMutableTripMutation = customMutation(internalMutation, {
  args: internalTripIdArgs,
  input: async (ctx, { asRun, tripId }) => ({
    args: {},
    ctx: boundTrip(await loadMutableTrip(ctx, tripId, await requireActor(ctx, asRun)))
  })
});
export const internalSharedTripQuery = customQuery(internalQuery, {
  args: internalTripIdArgs,
  input: async (ctx, { asRun, tripId }) => ({
    args: {},
    ctx: boundTrip(await loadSharedTripContext(ctx, tripId, await requireActor(ctx, asRun)))
  })
});
export const internalSharedTripMutation = customMutation(internalMutation, {
  args: internalTripIdArgs,
  input: async (ctx, { asRun, tripId }) => ({
    args: {},
    ctx: boundTrip(await loadSharedTripContext(ctx, tripId, await requireActor(ctx, asRun)))
  })
});
```

`destinationArgsInput` gains `workspace?: Workspace` and passes it to `loadMutableTrip`; `internalDestinationMutation` uses `args: { ...destinationArgs, ...runActorArgs }` and `input: async (ctx, { asRun, destinationId, tripId }) => await destinationArgsInput(ctx, tripId, destinationId, await requireActor(ctx, asRun))`.

- [ ] **Step 6: Raw internal functions the tools and session call.** Convert to actor-aware builders (handlers unchanged; inner `requireWorkspace(ctx)` now returns the bound workspace):
  - `modules/assistant/model/index.ts`: `access`, `taggedContext` → `internalWorkspaceQuery`; `setScreenContext`, `setContextTags` → `internalWorkspaceMutation`. In `access`, replace `const workspace = await requireWorkspace(ctx)` with `const { workspace } = ctx`.
  - `modules/discussions/research/tools.ts`: `list`, `read`, `instructionContext` → `internalWorkspaceQuery`; `create`, `post`, `link`, `unlink` → `internalWorkspaceMutation`. Imports from `#convex/modules/auth/workspace`.
  - `modules/assistant/model/thread/access.ts` `AssistantThreads.require`: unchanged (bound workspace).
- [ ] **Step 7: Run, expect pass.**
Run: `cd /workspaces/groam/packages/backend && vp test run convex/modules/auth convex/modules/assistant/agent convex/modules/discussions/research`
Expected: PASS (actor tests plus existing agent/research suites unchanged).

---

### Task 1.4: Bind the run actor onto every tool call

**Files:**
- Modify: `packages/backend/assistant/tools/factory.ts:13-23`
- Modify: `packages/backend/assistant/tools/index.ts:25-46`
- Modify: `packages/backend/assistant/tools/index.test.ts`

**Interfaces:**
- Produces: `AssistantToolRuntime.actorRunId?: Id<'agentRuns'>` (does not change `runId`, which still means "attach proposals to this standalone run").
- Produces: `bindRunActor(tool: AssistantTool, runId: Id<'agentRuns'>): AssistantTool` (module-private, tested through `createRegisteredAssistantTools`).

- [ ] **Step 1: Failing test.** Append to `packages/backend/assistant/tools/index.test.ts`:

```ts
test('tools called inside a run pass asRun on every Convex call', async () => {
  const { tools } = createRegisteredAssistantTools({
    activeTripId: 'trip-1' as never,
    actorRunId: 'run-1' as never,
    agentId: 'groam',
    prompt: 'What is the status?',
    scope: 'discussion',
    screen: workspaceScreen,
    threadId: 'thread-1'
  });
  const calls: unknown[] = [];
  const ctx = {
    runQuery: async (_ref: unknown, args: unknown) => {
      calls.push(args);
      return { tripName: 'Rome' };
    }
  };
  const status = { ...tools.getTripStatus, ctx } as unknown as {
    execute: (input: unknown, options: unknown) => Promise<unknown>;
  };
  await status.execute({}, { messages: [], toolCallId: 'call-1' });
  expect(calls).toEqual([expect.objectContaining({ asRun: 'run-1', tripId: 'trip-1' })]);
});
```

(`workspaceScreen` is the screen constant already used in this file; add it if missing: `{ capabilities: [], data: '{}', description: 'Home', key: 'workspace:home', target: { kind: 'workspace' }, title: 'Home' }`.)

- [ ] **Step 2: Run, expect fail.**
Run: `cd /workspaces/groam/packages/backend && vp test run assistant/tools/index.test.ts -t "asRun"`
Expected: FAIL (`asRun` missing).

- [ ] **Step 3: Runtime field.** `factory.ts` `AssistantToolRuntime`: add `/** Run whose creator the tools act for when there is no signed-in caller. */ actorRunId?: Id<'agentRuns'>;`.
- [ ] **Step 4: Wrapper.** In `tools/index.ts`:

```ts
type ToolCtx = {
  runAction?: (ref: unknown, args?: Record<string, unknown>) => Promise<unknown>;
  runMutation?: (ref: unknown, args?: Record<string, unknown>) => Promise<unknown>;
  runQuery?: (ref: unknown, args?: Record<string, unknown>) => Promise<unknown>;
};

function withRunActor<Ctx extends ToolCtx>(ctx: Ctx, runId: Id<'agentRuns'>): Ctx {
  const bind =
    (call: ((ref: unknown, args?: Record<string, unknown>) => Promise<unknown>) | undefined) =>
    call ? (ref: unknown, args: Record<string, unknown> = {}) => call(ref, { ...args, asRun: runId }) : undefined;
  return {
    ...ctx,
    runAction: bind(ctx.runAction?.bind(ctx)),
    runMutation: bind(ctx.runMutation?.bind(ctx)),
    runQuery: bind(ctx.runQuery?.bind(ctx))
  };
}

/**
 * Convex tools read their ctx from `this.ctx`, which the Agent injects by spreading the tool.
 * Rebinding here keeps every tool file unaware of runs. Tools only call internal functions built
 * with actor-aware builders (Task 1.3), so the extra arg always validates.
 */
function bindRunActor(tool: AssistantTool, runId: Id<'agentRuns'>): AssistantTool {
  const execute = tool.execute;
  if (!execute) return tool;
  return {
    ...tool,
    execute(this: { ctx?: ToolCtx }, input: unknown, options: ToolExecutionOptions<unknown>) {
      const ctx = this.ctx ?? (tool as { ctx?: ToolCtx }).ctx;
      const bound = ctx ? { ...this, ctx: withRunActor(ctx, runId) } : this;
      return execute.call(bound, input as never, options as never);
    }
  } as AssistantTool;
}
```

In `collectAssistantTool`, after computing `writeAllowed`, set
`const runTool = (tool: AssistantTool) => (runtime.actorRunId ? bindRunActor(tool, runtime.actorRunId) : tool);`
and store `tools[toolName] = writeAllowed ? runTool(tool) : denyUnrequestedWrite(toolName, tool);`. Provider tools (no `execute` from `createTool`) pass through unchanged.

- [ ] **Step 5: Run, expect pass.** Same command → PASS; then `vp test run assistant/tools` → PASS.

---

### Task 1.5: The engine — workflow, turn, completion

**Files:**
- Create: `packages/backend/convex/modules/assistant/engine/manager.ts`
- Create: `packages/backend/convex/modules/assistant/engine/schema.ts`
- Create: `packages/backend/convex/modules/assistant/engine/workflow.ts`
- Create: `packages/backend/convex/modules/assistant/engine/turn.ts`
- Create: `packages/backend/convex/modules/assistant/engine/turns.ts`
- Create: `packages/backend/convex/modules/assistant/engine/functions.ts`
- Create: `packages/backend/convex/modules/assistant/engine/index.ts`
- Create: `packages/backend/convex/modules/assistant/engine/engine.test.ts`
- Modify: `packages/backend/convex/modules/assistant/agent/session.ts:57-215,363-421`
- Modify: `packages/backend/convex/modules/assistant/standalone/session.ts:22-234`
- Modify: `packages/backend/convex/modules/discussions/threads/index.ts:673-713` (`finishAssistantResponse`)
- Modify: `packages/backend/convex/modules/assistant/runs/index.ts` (`claim` → `claimTurn`; `finish` unchanged)
- Modify: `packages/backend/convex/modules/assistant/README` section in `modules/README.md` (add `engine/`, `waits/` to the assistant tree)

**Interfaces:**
- Produces (`engine/schema.ts`):

```ts
export type WaitResume = { reason: 'cancelled' | 'deadline' | 'met'; waitId: string };
export type TurnResult =
  | { kind: 'aborted' }
  | { kind: 'done' }
  | { kind: 'failed'; error: string }
  | { kind: 'wait'; eventId: string };
export type RunOutcome = Exclude<TurnResult, { kind: 'wait' }> | { kind: 'exhausted' };
export const waitResumeValidator; export const turnResultValidator; export const runOutcomeValidator;
```
- Produces: `internal.modules.assistant.engine.workflow.agentRun` (args `{ runId }`), `internal.modules.assistant.engine.turn.run` (args `{ runId; resume?: WaitResume }`, returns `TurnResult`), `internal.modules.assistant.engine.functions.{claimTurn, recordReply, onComplete, expireQueued, turnContext}`.
- Produces (`engine/index.ts`): `AgentEngine.start(ctx: MutationCtx, runId: Id<'agentRuns'>): Promise<null>` (idempotent: no-op when `workflowId` set or run not `queued`/`running`); `AgentEngine.cancel(ctx: MutationCtx, run: Doc<'agentRuns'>): Promise<null>`.
- Consumes: `AgentRuns.finish`, `AgentRunTracking.record`, `Discussions.finishAssistantResponse`, `AssistantSession.continueDiscussion`, `StandaloneSession.turn`.

- [ ] **Step 1: Failing tests.** Create `engine/engine.test.ts`:

```ts
import { mockModel } from '@convex-dev/agent';
import { expectConsole } from '@groam/vitest-config/console';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { setupTrip } from '#testing/trips';
import { runUntil } from '#testing/workflows';

vi.useRealTimers();
afterEach(() => vi.restoreAllMocks());

const issueAgent = { agentId: 'issue' as const, kind: 'agent' as const, name: 'Issue agent' };

function useModel(model: ReturnType<typeof mockModel>) {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: model,
    modelId: 'test-model'
  } as never);
}

async function assignedIssueRun() {
  const trip = await setupTrip(0);
  const issueId = await trip.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Pick a rainy-day option.',
    title: 'Rainy-day option',
    tripId: trip.tripId
  });
  const runId = await trip.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected a run');
  return { ...trip, runId };
}

async function runDoc(trip: Awaited<ReturnType<typeof setupTrip>>, runId: Id<'agentRuns'>) {
  return await trip.owner.test.run((ctx) => ctx.db.get('agentRuns', runId));
}

test('assigning an issue starts a workflow that completes the run with its report', async () => {
  useModel(mockModel({ content: [{ text: 'Booked the museum for a rainy day.', type: 'text' }] }));
  const trip = await assignedIssueRun();
  await runUntil(trip.owner.test, async () => (await runDoc(trip, trip.runId))?.status === 'complete');
  expect(await runDoc(trip, trip.runId)).toMatchObject({
    report: 'Booked the museum for a rainy day.',
    status: 'complete',
    workflowId: expect.any(String)
  });
});

test('an empty standalone reply fails the run with today’s copy', async () => {
  useModel(mockModel({ content: [] }));
  expectConsole('error', 'standalone agent run failed');
  const trip = await assignedIssueRun();
  await runUntil(trip.owner.test, async () => (await runDoc(trip, trip.runId))?.status === 'failed');
  expect((await runDoc(trip, trip.runId))?.error).toContain('The agent returned nothing');
});

test('starting the same run twice keeps one workflow', async () => {
  useModel(mockModel({ content: [{ text: 'Done.', type: 'text' }] }));
  const trip = await assignedIssueRun();
  const first = (await runDoc(trip, trip.runId))?.workflowId;
  await trip.owner.client.mutation(api.routes.agents.runs.start.run, { runId: trip.runId });
  expect((await runDoc(trip, trip.runId))?.workflowId).toBe(first);
});

test('stopping a run cancels its workflow and keeps it aborted', async () => {
  useModel(mockModel({ content: [{ text: 'Done.', type: 'text' }] }));
  const trip = await assignedIssueRun();
  await trip.owner.client.mutation(api.routes.agents.runs.stop.run, { runId: trip.runId });
  await runUntil(trip.owner.test, async () => {
    const run = await runDoc(trip, trip.runId);
    return run?.status === 'aborted' && run.completedAt !== undefined;
  });
  expect((await runDoc(trip, trip.runId))?.status).toBe('aborted');
});

test('a discussion turn streams through the workflow and finishes the request', async () => {
  useModel(mockModel({ content: [{ text: 'Sushi on Friday works.', type: 'text' }] }));
  const { owner, tripId } = await setupTrip(0);
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [],
    title: 'Dinner',
    tripId
  });
  const sent = await owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId,
    text: '@groam where should we eat?'
  });
  await owner.client.mutation(api.routes.discussions.messages.respond.run, {
    discussionId,
    promptMessageId: sent.messageId,
    screen: {
      capabilities: [],
      data: '{}',
      description: 'Chat',
      key: `chat:${discussionId}`,
      target: { kind: 'workspace' },
      title: 'Dinner'
    }
  });
  await runUntil(owner.test, async () => {
    const message = await owner.test.run((ctx) =>
      ctx.db
        .query('discussionMessages')
        .withIndex('by_discussionId_and_agentMessageId', (query) =>
          query.eq('discussionId', discussionId).eq('agentMessageId', sent.messageId)
        )
        .unique()
    );
    return message?.assistantStatus === 'complete';
  });
  const run = await owner.test.run((ctx) =>
    ctx.db
      .query('agentRuns')
      .withIndex('by_discussionId_and_updatedAt', (query) => query.eq('discussionId', discussionId))
      .first()
  );
  expect(run).toMatchObject({ report: 'Sushi on Friday works.', status: 'complete' });
});
```

- [ ] **Step 2: Run, expect fail.**
Run: `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant/engine/engine.test.ts`
Expected: FAIL (module `engine/*` missing; `respond.run` is an action).

- [ ] **Step 3: `engine/manager.ts`.**

```ts
import { WorkflowManager } from '@convex-dev/workflow';
import { components } from '#convex-generated/api';

/** The single workflow manager for agent runs. Turns opt out of retries per step. */
export const agentWorkflow = new WorkflowManager(components.workflow, {
  workpoolOptions: { maxParallelism: 10, retryActionsByDefault: false }
});
```

- [ ] **Step 4: `engine/schema.ts`.**

```ts
import { type Infer, v } from 'convex/values';

/** What the workflow journals for a resume: an id and a reason. The turn loads the rest. */
export const waitResumeValidator = v.object({
  reason: v.union(v.literal('met'), v.literal('deadline'), v.literal('cancelled')),
  waitId: v.string()
});

export const turnResultValidator = v.union(
  v.object({ kind: v.literal('done') }),
  v.object({ kind: v.literal('aborted') }),
  v.object({ error: v.string(), kind: v.literal('failed') }),
  v.object({ eventId: v.string(), kind: v.literal('wait') })
);

export const runOutcomeValidator = v.union(
  v.object({ kind: v.literal('done') }),
  v.object({ kind: v.literal('aborted') }),
  v.object({ error: v.string(), kind: v.literal('failed') }),
  v.object({ kind: v.literal('exhausted') })
);

export type WaitResume = Infer<typeof waitResumeValidator>;
export type TurnResult = Infer<typeof turnResultValidator>;
export type RunOutcome = Infer<typeof runOutcomeValidator>;

export const RUN_STALLED_ERROR = 'The run stopped responding. Try again.';
export const RUN_EXHAUSTED_ERROR = 'The run reached its turn limit.';
export const RECONNECT_CHATGPT_LABEL = 'Reconnect ChatGPT to continue';
export const QUEUED_RUN_TIMEOUT_MS = 10 * 60 * 1000;
```

- [ ] **Step 5: `engine/workflow.ts` (frozen body).**

```ts
import type { EventId } from '@convex-dev/workflow';
import { v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { agentWorkflow } from '#convex/modules/assistant/engine/manager';
import {
  type RunOutcome,
  runOutcomeValidator,
  type TurnResult,
  type WaitResume,
  waitResumeValidator
} from '#convex/modules/assistant/engine/schema';

export const MAX_TURNS = 25;

/**
 * FROZEN. Runs may sleep for days and replay across deploys; any change to the steps this body
 * issues fails in-flight runs with a determinism violation. All behavior belongs in the `turn`
 * action. A real change ships as a new workflow (`agentRunV2`) beside this one.
 */
export const agentRun = agentWorkflow
  .define({ args: { runId: v.id('agentRuns') }, returns: runOutcomeValidator })
  .handler(async (step, { runId }): Promise<RunOutcome> => {
    let resume: WaitResume | undefined;
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const result: TurnResult = await step.runAction(
        internal.modules.assistant.engine.turn.run,
        resume ? { resume, runId } : { runId },
        { retry: false }
      );
      if (result.kind !== 'wait') return result;
      resume = await step.awaitEvent({
        id: result.eventId as EventId,
        validator: waitResumeValidator
      });
    }
    return { kind: 'exhausted' };
  });
```

- [ ] **Step 6: `engine/turn.ts`.**

```ts
import { v } from 'convex/values';
import { internalAction } from '#convex-generated/server';
import { AgentTurns } from '#convex/modules/assistant/engine/turns';
import {
  type TurnResult,
  turnResultValidator,
  waitResumeValidator
} from '#convex/modules/assistant/engine/schema';

/** One model turn of a run. Free to change between deploys; the workflow only sees ids. */
export const run = internalAction({
  args: { resume: v.optional(waitResumeValidator), runId: v.id('agentRuns') },
  returns: turnResultValidator,
  handler: (ctx, args): Promise<TurnResult> => AgentTurns.run(ctx, args)
});
```

- [ ] **Step 7: `engine/functions.ts`.**

```ts
import { vResultValidator, vWorkflowId } from '@convex-dev/workflow';
import { v } from 'convex/values';
import { internalMutation, internalQuery } from '#convex-generated/server';
import { RUN_EXHAUSTED_ERROR, RUN_STALLED_ERROR } from '#convex/modules/assistant/engine/schema';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentRunValidators } from '#convex/modules/assistant/runs/schema';
import { assistantScreenValidator } from '#convex/modules/assistant/validators/index';
import { Discussions } from '#convex/modules/discussions/threads/index';

/** queued|waiting → running. Null when the run was stopped or already finished. */
export const claimTurn = internalMutation({
  args: { runId: v.id('agentRuns') },
  returns: v.union(AgentRunValidators.run, v.null()),
  handler: async (ctx, { runId }) => {
    const claimed = await AgentRuns.claimTurn(ctx, runId);
    return claimed ? AgentRuns.presentRun(claimed) : null;
  }
});

/** Chat turns need the stored screen and prompt, which the run view does not expose. */
export const turnContext = internalQuery({
  args: { runId: v.id('agentRuns') },
  returns: v.object({
    actorTokenIdentifier: v.union(v.string(), v.null()),
    promptMessageId: v.union(v.string(), v.null()),
    screen: v.union(assistantScreenValidator, v.null())
  }),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get('agentRuns', runId);
    return {
      actorTokenIdentifier: run?.actorTokenIdentifier ?? null,
      promptMessageId: run?.promptMessageId ?? null,
      screen: run?.screen ?? null
    };
  }
});

/** Stores the reply text so `onComplete` can finish the run and the discussion request. */
export const recordReply = internalMutation({
  args: { runId: v.id('agentRuns'), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { runId, text }) => {
    await ctx.db.patch('agentRuns', runId, { report: text, updatedAt: Date.now() });
    return null;
  }
});

/** The single writer of a run's terminal status. */
export const onComplete = internalMutation({
  args: {
    context: v.object({ runId: v.id('agentRuns') }),
    result: vResultValidator,
    workflowId: vWorkflowId
  },
  returns: v.null(),
  handler: async (ctx, { context, result }) => {
    const run = await ctx.db.get('agentRuns', context.runId);
    if (!run) return null;
    const outcome =
      result.kind === 'success'
        ? (result.returnValue as { error?: string; kind: string })
        : result.kind === 'canceled'
          ? { kind: 'aborted' }
          : { error: RUN_STALLED_ERROR, kind: 'failed' };
    if (result.kind !== 'success' && result.kind !== 'canceled') {
      console.error('agent run workflow failed:', 'error' in result ? result.error : result);
    }
    const status =
      outcome.kind === 'done' ? 'complete' : outcome.kind === 'aborted' ? 'aborted' : 'failed';
    const error =
      outcome.kind === 'exhausted' ? RUN_EXHAUSTED_ERROR : status === 'failed' ? outcome.error : undefined;
    if (run.discussionId && run.promptMessageId) {
      await Discussions.finishAssistantResponse(ctx, {
        discussionId: run.discussionId,
        error,
        expectedUpdatedAt: run.discussionUpdatedAt ?? 0,
        promptMessageId: run.promptMessageId,
        responseText: status === 'complete' ? (run.report ?? '') : null,
        runId: run._id
      });
      return null;
    }
    await AgentRuns.finish(ctx, {
      runId: run._id,
      status,
      ...(error ? { error } : {}),
      ...(status === 'complete' && run.report ? { report: run.report } : {})
    });
    return null;
  }
});

/** A discussion turn nobody started (closed tab, failed client call) fails after the window. */
export const expireQueued = internalMutation({
  args: { runId: v.id('agentRuns') },
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get('agentRuns', runId);
    if (run?.status !== 'queued') return null;
    await AgentRuns.finish(ctx, { error: RUN_STALLED_ERROR, runId, status: 'failed' });
    return null;
  }
});
```

Note: `AgentRuns.finish` on `complete` with `report` sets the headline (`report.slice(0,160)`) exactly as today; `finishAssistantResponse` calls `AgentRuns.finish` itself.

- [ ] **Step 8: `runs/index.ts`.** Replace `claim` with `claimTurn` (statuses `queued` and, from Chunk 2, `waiting` move to `running`; `running` returns the run unchanged so a crashed-and-restarted turn is not possible because retries are off; terminal → `null`):

```ts
async function claimTurn(ctx: RunWriter, runId: Id<'agentRuns'>): Promise<Doc<'agentRuns'> | null> {
  const run = await ctx.db.get('agentRuns', runId);
  if (!run) throw new ConvexError('Agent run not found');
  if (run.status === 'complete' || run.status === 'failed' || run.status === 'aborted') return null;
  const now = Date.now();
  const patch = {
    headline: 'Working…',
    startedAt: run.startedAt ?? now,
    status: 'running' as const,
    updatedAt: now
  };
  await ctx.db.patch('agentRuns', runId, patch);
  return { ...run, ...patch };
}
```

Export it on the facade as `static claimTurn = claimTurn;` and delete `static claim`. In `queueDiscussionTurn` add after insert:
`await ctx.scheduler.runAfter(QUEUED_RUN_TIMEOUT_MS, internal.modules.assistant.engine.functions.expireQueued, { runId });` (import `internal` and `QUEUED_RUN_TIMEOUT_MS`).

- [ ] **Step 9: `Discussions.finishAssistantResponse` without identity.** It runs from `onComplete` (no auth). Replace `const { discussion } = await DiscussionAccess.require(ctx, discussionId);` with:

```ts
    const discussion = await ctx.db.get('discussions', discussionId);
    if (!discussion) return;
```

(Callers are internal: `onComplete`, the respond mutation's rate-limit branch, and `finishResponse`.)

- [ ] **Step 10: Session — chat turn acts for the run.** In `agent/session.ts`:
  - `workspaceAccess(ctx, threadId?, scope = 'private', asRun?: Id<'agentRuns'>)` passes `...(asRun ? { asRun } : {})` to `internal.modules.assistant.model.index.access`; `researchContext` passes the same to `instructionContext`.
  - `CreateAssistantOptions` gains `actorRunId?: Id<'agentRuns'>`, forwarded into `createRegisteredAssistantTools({ …, ...(actorRunId ? { actorRunId } : {}) })`.
  - `continueAssistantWithConfiguration` forwards `options.runId` as both `asRun` (access/research) and `actorRunId`.
  - `continueDiscussion(ctx, target, promptMessageId, runId)` calls `workspaceAccess(ctx, target.threadId, 'discussion', runId)`.
  - The `isAborted` branches remain; the function still returns the reply text or `null`.
- [ ] **Step 11: Standalone session — one turn, no claim/finish.** In `standalone/session.ts` rename `execute` to `turn(ctx, run: AgentRunView): Promise<{ report: string }>`: drop `claimRun`/`finishRun` calls and the outer try/catch (the turn wrapper owns errors), pass `actorRunId: run.id` into `createRegisteredAssistantTools`, and keep `executeIssue` / `executeReview` bodies. Export `StandaloneSession.turn`. Delete `standalone/execute.ts` (its scheduled entry point is gone).
- [ ] **Step 12: `engine/turns.ts`.**

```ts
import { ConvexError } from 'convex/values';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';
import { AssistantSession } from '#convex/modules/assistant/agent/index';
import type { TurnResult, WaitResume } from '#convex/modules/assistant/engine/schema';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import type { AgentRunView } from '#convex/modules/assistant/runs/schema';
import { AgentRunTracking } from '#convex/modules/assistant/runs/tracking';
import { StandaloneSession } from '#convex/modules/assistant/standalone/index';

async function chatTurn(ctx: ActionCtx, run: AgentRunView): Promise<TurnResult> {
  const stored = await ctx.runQuery(internal.modules.assistant.engine.functions.turnContext, {
    runId: run.id
  });
  if (!run.threadId || !stored.screen || !stored.promptMessageId || !run.discussionId) {
    throw new ConvexError('Discussion run is missing its prompt');
  }
  const discussion = await ctx.runQuery(internal.modules.discussions.assistant.index.prompt, {
    discussionId: run.discussionId,
    promptMessageId: stored.promptMessageId
  });
  const reply = await AssistantSession.continueDiscussion(
    ctx,
    { agent: discussion.agent, prompt: discussion.prompt, screen: stored.screen, threadId: run.threadId },
    stored.promptMessageId,
    run.id
  );
  if (reply === null || (await AgentRunTracking.isAborted(ctx, run.id))) return { kind: 'aborted' };
  await ctx.runMutation(internal.modules.assistant.engine.functions.recordReply, {
    runId: run.id,
    text: reply.trim()
  });
  return { kind: 'done' };
}

async function standaloneTurn(ctx: ActionCtx, run: AgentRunView): Promise<TurnResult> {
  const { report } = await StandaloneSession.turn(ctx, run);
  if (await AgentRunTracking.isAborted(ctx, run.id)) return { kind: 'aborted' };
  await ctx.runMutation(internal.modules.assistant.engine.functions.recordReply, {
    runId: run.id,
    text: report
  });
  return { kind: 'done' };
}

async function run(
  ctx: ActionCtx,
  { runId }: { resume?: WaitResume; runId: Id<'agentRuns'> }
): Promise<TurnResult> {
  const claimed = await ctx.runMutation(internal.modules.assistant.engine.functions.claimTurn, {
    runId
  });
  if (!claimed) return { kind: 'aborted' };
  try {
    return claimed.surface === 'chat'
      ? await chatTurn(ctx, claimed)
      : await standaloneTurn(ctx, claimed);
  } catch (error: unknown) {
    if (await AgentRunTracking.isAborted(ctx, runId)) return { kind: 'aborted' };
    const message = AssistantErrors.message(error);
    console.error(
      claimed.surface === 'chat' ? 'discussion assistant respond failed:' : 'standalone agent run failed:',
      message,
      error
    );
    await AgentRunTracking.record(ctx, runId, { detail: message, kind: 'error', label: 'Run failed' });
    return { error: message, kind: 'failed' };
  }
}

/** Action-side body of one workflow turn. Never throws for model or tool failures. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class AgentTurns {
  static run = run;
}
```

Add to `modules/discussions/assistant/index.ts` the internal query used above:

```ts
export const prompt = internalQuery({
  args: { discussionId: v.id('discussions'), promptMessageId: v.string() },
  returns: v.object({ agent: chatAgentValidator, prompt: v.string() }),
  handler: async (ctx, { discussionId, promptMessageId }) => {
    const request = await ctx.db
      .query('discussionMessages')
      .withIndex('by_discussionId_and_agentMessageId', (query) =>
        query.eq('discussionId', discussionId).eq('agentMessageId', promptMessageId)
      )
      .unique();
    if (!request?.assistantAgent) throw new ConvexError('AI request not found');
    return { agent: request.assistantAgent, prompt: request.content.text };
  }
});
```

Chat behavior parity: today a blank chat reply (tool calls only) is stored as `responseText: ''` and `finishAssistantResponse` marks the request failed with `Groam returned an empty reply`. `recordReply(text: '')` + `onComplete` (`responseText: run.report ?? ''`) preserves that.

- [ ] **Step 13: `engine/index.ts`.**

```ts
import { cancel, start } from '@convex-dev/workflow';
import { components, internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';

async function startRun(ctx: MutationCtx, runId: Id<'agentRuns'>): Promise<null> {
  const run = await ctx.db.get('agentRuns', runId);
  if (!run || run.workflowId) return null;
  if (run.status !== 'queued' && run.status !== 'running') return null;
  const workflowId = await start(
    ctx,
    internal.modules.assistant.engine.workflow.agentRun,
    { runId },
    { context: { runId }, onComplete: internal.modules.assistant.engine.functions.onComplete }
  );
  await ctx.db.patch('agentRuns', runId, { workflowId, updatedAt: Date.now() });
  return null;
}

/** Cancels the workflow; in-flight turn actions finish and see the aborted status. */
async function cancelRun(ctx: MutationCtx, run: Doc<'agentRuns'>): Promise<null> {
  if (!run.workflowId) return null;
  try {
    await cancel(ctx, components.workflow, run.workflowId as never);
  } catch (error: unknown) {
    // Already finished: the run's terminal status was written by onComplete.
    console.warn('agent run workflow cancel skipped:', error);
  }
  return null;
}

/** Lifecycle of agent runs as durable workflows. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class AgentEngine {
  static cancel = cancelRun;
  static start = startRun;
}
```

- [ ] **Step 14: Run, expect pass for the standalone cases.** (The discussion case passes after Task 1.6.)
Run: `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant/engine/engine.test.ts -t "issue|standalone|twice|stopping"`
Expected: PASS after Task 1.6 Step 3 wires `assign` to `AgentEngine.start`; do Task 1.6 before re-running if it fails with "run stayed queued".

---

### Task 1.6: Entry points start and stop workflows

**Files:**
- Modify: `packages/backend/convex/routes/discussions/messages/respond.ts`
- Modify: `packages/backend/convex/modules/discussions/assistant/respond.ts` (becomes mutation-side)
- Modify: `packages/backend/convex/routes/agents/runs/start.ts`
- Modify: `packages/backend/convex/modules/travel/issues/assign.ts:62-63,93-94`
- Modify: `packages/backend/convex/modules/travel/versions/index.ts:63`
- Modify: `packages/backend/convex/modules/assistant/runs/index.ts` (`retryIssueRun`, `stopRun`, `abortActiveRun`)
- Modify: `packages/backend/convex/modules/discussions/threads/index.ts:590-606` (`stop`)
- Modify: `packages/backend/convex/modules/assistant/standalone/standalone.test.ts`
- Modify: `packages/backend/convex/modules/assistant/runs/runs.test.ts:735-755`

**Interfaces:**
- Produces: `api.routes.discussions.messages.respond.run` — **mutation**, args unchanged `{ discussionId, promptMessageId, screen }`, returns `null`.
- Produces: `api.routes.agents.runs.start.run` — **workspaceMutation**, args `{ runId }`, returns `null`.
- Produces: `DiscussionAssistant.respond(ctx: MutationCtx, args): Promise<null>`.

- [ ] **Step 1: Failing test edits.** In `standalone/standalone.test.ts` replace both `await owner.client.action(api.routes.agents.runs.start.run, { runId });` with

```ts
  await owner.client.mutation(api.routes.agents.runs.start.run, { runId });
  await runUntil(owner.test, async () => {
    const run = await owner.test.run((ctx) => ctx.db.get('agentRuns', runId));
    return run?.status === 'failed' || run?.status === 'complete';
  });
```

(import `runUntil` from `#testing/workflows`; add `vi.useRealTimers()` at top). In `runs.test.ts` test `assigning an issue to the agent schedules its run server-side`, replace the assertion with:

```ts
    const run = await owner.test.run((ctx) => ctx.db.get('agentRuns', runId));
    expect(run?.workflowId).toEqual(expect.any(String));
```

(capture `runId` from the `assign` call).

- [ ] **Step 2: Run, expect fail.**
Run: `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant/standalone convex/modules/assistant/runs`
Expected: FAIL (`start.run` is an action; no `workflowId`).

- [ ] **Step 3: Kickoffs.** Replace each `await ctx.scheduler.runAfter(0, internal.modules.assistant.standalone.execute.run, { runId });` with `await AgentEngine.start(ctx, runId);` in `issues/assign.ts` (2 sites) and `versions/index.ts` (1 site). In `retryIssueRun`, after `queueIssueRun`, call `await AgentEngine.start(ctx, nextRunId);` and delete the "client starts the run" comment. Import `AgentEngine` from `#convex/modules/assistant/engine/index`.
- [ ] **Step 4: `routes/agents/runs/start.ts`.**

```ts
import { ConvexError, v } from 'convex/values';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import { AgentEngine } from '#convex/modules/assistant/engine/index';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import { workspaceMutation } from '#convex/modules/auth/workspace';

export const run = workspaceMutation({
  args: { runId: v.id('agentRuns') },
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    const stored = await ctx.db.get('agentRuns', runId);
    if (!stored || stored.organizationId !== ctx.workspace.organizationId) {
      throw new ConvexError('Agent run not found');
    }
    if (stored.surface !== 'standalone') {
      throw new ConvexError('Only standalone runs start from the agent monitor');
    }
    if (stored.workflowId) return null;
    try {
      await aiRateLimiter.limit(ctx, 'tripAssistantMessage', {
        key: ctx.workspace.tokenIdentifier,
        throws: true
      });
    } catch (error: unknown) {
      throw new ConvexError(AssistantErrors.message(error));
    }
    return await AgentEngine.start(ctx, runId);
  }
});
```

- [ ] **Step 5: Respond becomes a mutation.** `modules/discussions/assistant/respond.ts`:

```ts
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import type { AssistantScreen } from '#convex/modules/assistant/agent/index';
import { AgentEngine } from '#convex/modules/assistant/engine/index';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import { AssistantScreens } from '#convex/modules/assistant/screen/index';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import { Discussions } from '#convex/modules/discussions/threads/index';

/** Claims the prompt and starts the run's workflow; the reply streams from the turn action. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class DiscussionAssistant {
  static async respond(
    ctx: MutationCtx,
    args: { discussionId: Id<'discussions'>; promptMessageId: string; screen: AssistantScreen }
  ): Promise<null> {
    const workspace = await requireWorkspace(ctx);
    AssistantScreens.validate(args.screen);
    const claim = await Discussions.claimAssistantResponse(
      ctx,
      args.discussionId,
      args.promptMessageId,
      args.screen
    );
    if (!claim) return null;
    try {
      await aiRateLimiter.limit(ctx, 'tripAssistantMessage', {
        key: workspace.tokenIdentifier,
        throws: true
      });
    } catch (error: unknown) {
      await Discussions.finishAssistantResponse(ctx, {
        discussionId: args.discussionId,
        error: AssistantErrors.message(error),
        expectedUpdatedAt: claim.expectedUpdatedAt,
        promptMessageId: args.promptMessageId,
        responseText: null,
        runId: claim.runId
      });
      return null;
    }
    return await AgentEngine.start(ctx, claim.runId);
  }
}
```

`routes/discussions/messages/respond.ts`: `import { mutation } from '#convex-generated/server';` and `export const run = mutation({ … handler: (ctx, args) => DiscussionAssistant.respond(ctx, args) })`. The rate-limiter component call that throws rolls back its own writes; the claim and the failure patch commit (Convex sub-transaction semantics).

- [ ] **Step 6: Stop paths cancel workflows.** In `runs/index.ts`:

```ts
async function abortActiveRun(ctx: RunWriter, run: Doc<'agentRuns'> | null): Promise<null> {
  if (!run) return null;
  if (run.status !== 'queued' && run.status !== 'running') return null;
  const now = Date.now();
  await ctx.db.patch('agentRuns', run._id, {
    completedAt: now,
    headline: 'Stopped',
    status: 'aborted',
    updatedAt: now
  });
  await AgentEngine.cancel(ctx, run);
  return null;
}
```

`stopRun` ends with:

```ts
  await finish(ctx, { runId, status: 'aborted' });
  await AgentEngine.cancel(ctx, run);
  return null;
```

`Discussions.stop` is unchanged (it calls `abortActiveForDiscussion`, which now cancels). `onComplete` on `canceled` calls `finishAssistantResponse(responseText: null)` (request marked failed with the fallback copy, run already `aborted` so `finish` no-ops) — today's stop outcome.

- [ ] **Step 7: Run, expect pass.**
Run: `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant convex/modules/discussions convex/modules/travel/issues`
Expected: PASS, including all of `engine.test.ts`.

---

### Task 1.7: Web callers use the new mutations

**Files:**
- Modify: `apps/web/src/features/discussions/hooks/use-discussion-thread.ts:111`
- Modify: `apps/web/src/features/discussions/hooks/discussion-send.ts:35-65`
- Modify: `apps/web/src/features/research/hooks/use-research-actions.ts:48-52`
- Modify: `apps/web/src/features/agents/hooks/use-agent-run.ts:1-50`
- Modify: matching `*.test.tsx` hook tests that mock `useAction`

**Interfaces:**
- Consumes: `api.routes.discussions.messages.respond.run` (mutation), `api.routes.agents.runs.start.run` (mutation).

- [ ] **Step 1: Failing test.** In `apps/web/src/features/discussions/hooks/use-discussion-thread.test.tsx`, change the mocked `convex/react` so `useAction` throws when called with the respond route and `useMutation` returns the respond spy:

```ts
vi.mock('convex/react', async () => ({
  ...(await vi.importActual<object>('convex/react')),
  useAction: () => {
    throw new Error('respond is a mutation now');
  },
  useMutation: (reference: unknown) => mutationFor(reference)
}));
```

(`mutationFor` maps `api.routes.discussions.messages.send.run` → send spy, `…respond.run` → respond spy, `…stop.run` → stop spy; reuse the existing spies.)
- [ ] **Step 2: Run, expect fail.**
Run: `cd /workspaces/groam/apps/web && vp test run --project views src/features/discussions/hooks/use-discussion-thread.test.tsx`
Expected: FAIL (`respond is a mutation now`).
- [ ] **Step 3: Implement.** `use-discussion-thread.ts`: `const respondAction = useMutation(api.routes.discussions.messages.respond.run);` (rename variable to `respondMutation` throughout, including `sendDiscussionMessage` param `respondMutation: ReturnType<typeof useMutation>`). `use-research-actions.ts`: `const respondMutation: ReturnType<typeof useMutation> = useMutation(api.routes.discussions.messages.respond.run);`. `use-agent-run.ts`: `const start = useMutation(api.routes.agents.runs.start.run);` and drop the `useAction` import.
- [ ] **Step 4: Run, expect pass.**
Run: `cd /workspaces/groam/apps/web && vp test run --project views src/features/discussions src/features/research src/features/agents src/features/issues`
Expected: PASS.

---

### Task 1.8: Remove the sweep, claim, and legacy paths; migrate legacy runs

**Files:**
- Create: `packages/backend/convex/modules/assistant/engine/migrations.ts`
- Create: `packages/backend/convex/modules/assistant/engine/migrations.test.ts`
- Modify: `packages/backend/convex/crons.ts` (delete the job; file keeps an empty `cronJobs()` export)
- Modify: `packages/backend/convex/modules/assistant/runs/functions.ts` (delete `claimRun`, `finishRun`, `sweepStaleRuns`)
- Modify: `packages/backend/convex/modules/assistant/runs/index.ts` (delete `failStaleRuns`, `STALE_*` constants, `static claim`, `static failStaleRuns`)
- Modify: `packages/backend/convex/modules/assistant/runs/runs.test.ts:693-733,895-948` (replace stale-sweep tests)

**Interfaces:**
- Produces: `internal.modules.assistant.engine.migrations.failLegacyRuns` (args `{}`; returns `{ failed: number; more: boolean }`; reschedules itself while `more`).

- [ ] **Step 1: Failing test.** Create `engine/migrations.test.ts`:

```ts
import { expect, test } from 'vite-plus/test';
import { internal } from '#convex-generated/api';
import { setupTrip } from '#testing/trips';

test('fails legacy queued and running runs, leaves workflow runs alone', async () => {
  const { owner } = await setupTrip(0);
  const base = {
    agentId: 'issue' as const,
    createdBy: { name: 'Owner', userId: owner.userId },
    kickoff: 'assign' as const,
    organizationId: owner.organizationId as string,
    surface: 'standalone' as const,
    title: 'Legacy',
    updatedAt: Date.now()
  };
  const ids = await owner.test.run(async (ctx) => ({
    queued: await ctx.db.insert('agentRuns', { ...base, shortId: 'legacy01', status: 'queued' }),
    running: await ctx.db.insert('agentRuns', { ...base, shortId: 'legacy02', status: 'running' }),
    workflow: await ctx.db.insert('agentRuns', {
      ...base,
      shortId: 'legacy03',
      status: 'running',
      workflowId: 'wf-1'
    })
  }));
  await expect(
    owner.test.mutation(internal.modules.assistant.engine.migrations.failLegacyRuns, {})
  ).resolves.toEqual({ failed: 2, more: false });
  await owner.test.run(async (ctx) => {
    expect(await ctx.db.get('agentRuns', ids.queued)).toMatchObject({
      error: 'Interrupted by upgrade',
      status: 'failed'
    });
    expect((await ctx.db.get('agentRuns', ids.running))?.status).toBe('failed');
    expect((await ctx.db.get('agentRuns', ids.workflow))?.status).toBe('running');
  });
});
```

Replace the two stale-sweep tests in `runs.test.ts` with:

```ts
test('a queued discussion turn nobody starts fails after the window', async () => {
  const { owner } = await setupTrip(0);
  const runId = await owner.test.run(async (ctx) => {
    const discussionId = await ctx.db.insert('discussions', {
      shortId: 'queue001',
      clientRequestId: 'req-queue',
      createdBy: { name: 'Owner', userId: owner.userId },
      kind: 'group',
      members: [],
      organizationId: owner.organizationId as string,
      threadId: 'thread-queue',
      title: 'Queued',
      updatedAt: Date.now()
    });
    return await AgentRuns.queueDiscussionTurn(ctx, {
      agentId: 'groam',
      createdBy: { name: 'Owner', userId: owner.userId },
      discussionId,
      organizationId: owner.organizationId as string,
      threadId: 'thread-queue',
      title: 'Queued'
    });
  });
  await owner.test.mutation(internal.modules.assistant.engine.functions.expireQueued, { runId });
  await owner.test.run(async (ctx) => {
    expect(await ctx.db.get('agentRuns', runId)).toMatchObject({
      error: 'The run stopped responding. Try again.',
      status: 'failed'
    });
  });
});
```

- [ ] **Step 2: Run, expect fail.**
Run: `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant/engine/migrations.test.ts convex/modules/assistant/runs/runs.test.ts`
Expected: FAIL (`migrations` missing).
- [ ] **Step 3: `engine/migrations.ts`.**

```ts
import { v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { internalMutation } from '#convex-generated/server';

const BATCH = 100;
export const LEGACY_RUN_ERROR = 'Interrupted by upgrade';

/** One-off at deploy: runs started on the pre-workflow path can never finish. */
export const failLegacyRuns = internalMutation({
  args: {},
  returns: v.object({ failed: v.number(), more: v.boolean() }),
  handler: async (ctx) => {
    const now = Date.now();
    let failed = 0;
    let more = false;
    for (const status of ['queued', 'running'] as const) {
      const runs = await ctx.db
        .query('agentRuns')
        .withIndex('by_status_and_updatedAt', (query) => query.eq('status', status))
        .take(BATCH);
      if (runs.length === BATCH) more = true;
      for (const run of runs) {
        if (run.workflowId) continue;
        await ctx.db.patch('agentRuns', run._id, {
          completedAt: now,
          error: LEGACY_RUN_ERROR,
          headline: LEGACY_RUN_ERROR,
          status: 'failed',
          updatedAt: now
        });
        failed += 1;
      }
    }
    if (more) await ctx.scheduler.runAfter(0, internal.modules.assistant.engine.migrations.failLegacyRuns, {});
    return { failed, more };
  }
});
```

- [ ] **Step 4: Delete legacy code.** Remove `claimRun`, `finishRun`, `sweepStaleRuns` from `runs/functions.ts`; remove `failStaleRuns`, `STALE_RUN_MS`, `STALE_RUN_BATCH`, `STALE_RUN_ERROR`, `STALE_QUEUED_MS` and the facade lines from `runs/index.ts`; `crons.ts` becomes:

```ts
import { cronJobs } from 'convex/server';

const crons = cronJobs();

export default crons;
```

- [ ] **Step 5: Run, expect pass; confirm no stragglers.**
Run: `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant && rg -n "claimRun|finishRun|sweepStaleRuns|failStaleRuns|standalone\.execute|standalone/execute" convex assistant testing`
Expected: tests PASS; `rg` prints nothing.

---

### Task 1.9: Freeze the workflow body

**Files:**
- Create: `packages/backend/convex/modules/assistant/engine/workflow.test.ts`

**Interfaces:**
- Consumes: `listSteps` from `@convex-dev/workflow`.

- [ ] **Step 1: Write the guard.**

```ts
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mockModel } from '@convex-dev/agent';
import { listSteps } from '@convex-dev/workflow';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, components } from '#convex-generated/api';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { setupTrip } from '#testing/trips';
import { runUntil } from '#testing/workflows';

vi.useRealTimers();
afterEach(() => vi.restoreAllMocks());

/**
 * Changing this hash means in-flight runs replay a different body and fail. Do not update the
 * constant to make this pass: add `agentRunV2` and route new runs to it instead.
 */
const FROZEN_AGENT_RUN_SHA256 = '<fill in from Step 2 output>';

test('frozen agentRun body', () => {
  const source = readFileSync(new URL('./workflow.ts', import.meta.url), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe(FROZEN_AGENT_RUN_SHA256);
});

test('a single turn journals one turn step', async () => {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: mockModel({ content: [{ text: 'Done.', type: 'text' }] }),
    modelId: 'test-model'
  } as never);
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Body',
    title: 'Journal',
    tripId
  });
  const runId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' },
    issueId
  });
  if (!runId) throw new Error('Expected a run');
  await runUntil(owner.test, async () =>
    (await owner.test.run((ctx) => ctx.db.get('agentRuns', runId)))?.status === 'complete'
  );
  const run = await owner.test.run((ctx) => ctx.db.get('agentRuns', runId));
  const steps = await owner.test.run((ctx) =>
    listSteps(ctx, components.workflow, run?.workflowId as never)
  );
  expect(steps.page.map((step) => step.name)).toEqual(['modules/assistant/engine/turn:run']);
});
```

- [ ] **Step 2: Record the hash.**
Run: `cd /workspaces/groam/packages/backend && sha256sum convex/modules/assistant/engine/workflow.ts`
Paste the hex digest into `FROZEN_AGENT_RUN_SHA256` (this is the one allowed write of the constant, before Chunk 1 ships).
- [ ] **Step 3: Run.**
Run: `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant/engine/workflow.test.ts`
Expected: PASS. (If `listSteps` names steps differently in 0.4.10, assert the actual name it reports for the `turn.run` reference and keep the assertion exact.) The `turn, event, turn` journal assertion is added in Task 2.4.

---

### Chunk 1 verification

- [ ] Run, in order:

```bash
cd /workspaces/groam && just codegen
cd /workspaces/groam/packages/backend && vp run typecheck && vp test run
cd /workspaces/groam/apps/web && vp run typecheck && vp test run --project unit --project views src/features/discussions src/features/research src/features/agents src/features/issues
cd /workspaces/groam && vp run lint:conventions && vp check
```

- [ ] Acceptance evidence for reviewers:
  - `engine.test.ts`, `migrations.test.ts`, `workflow.test.ts`, `actor.test.ts`, and the edited `runs.test.ts` / `standalone.test.ts` / `threads.test.ts` pass; no prior test was deleted except the two stale-sweep tests replaced in Task 1.8.
  - `rg -n "standalone\.execute|sweepStaleRuns|claimRun|finishRun" packages/backend` is empty.
  - `workflow.ts` contains only the loop shown in Task 1.5 Step 5 and its hash is pinned.
  - Every internal function referenced from `packages/backend/assistant/tools/**` is built with an actor-aware builder: `rg -o "internal\.modules\.[a-zA-Z.]+" packages/backend/assistant/tools | sort -u` — reviewer opens each and checks its builder.
  - `requireWorkspace` returns a bound workspace before identity; reviewers check no public builder can bind a foreign workspace (only `customCtx`/internal inputs set `ctx.workspace`).
  - Manual: `just dev`, sign in as `demo@groam.example`, send `@groam hello` in a group chat → reply streams; assign an issue to the Issue agent → run completes on `/agents/issue`.

---

## Chunk 2: Waits module, `timer`, `waitFor`/`cancelWait`, banner waiting state

### Task 2.1: The `waiting` run status

**Files:**
- Modify: `packages/ai/src/backend/runs/ids.ts`
- Modify: `packages/ai/src/backend/runs/roster.ts:3-6`
- Modify: `packages/ai/src/backend/runs/roster.test.ts`
- Modify: `packages/backend/convex/modules/assistant/runs/index.ts:317-352` (`activeIssueRun`, `activeProposalRun`), `:981-989` (`retryIssueRun`)
- Modify: any exhaustive status map the typechecker flags (`rg -n "RUN_STATUS_LABEL|'queued'" apps/web/src packages/ai/src`)

**Interfaces:**
- Produces: `AgentRunStatus` includes `'waiting'`; `RUN_STATUS_LABEL.waiting = 'Waiting'`; `activeAgentRunStatusIds = ['queued', 'running', 'waiting']`; backend `isActiveRunStatus(status): boolean`.

- [ ] **Step 1: Failing test.** `packages/ai/src/backend/runs/roster.test.ts` add:

```ts
test('a waiting run is active and keeps the agent working', () => {
  expect(isActiveAgentRun({ status: 'waiting' })).toBe(true);
  expect(rosterStatusFromRuns([{ status: 'waiting' }])).toBe('working');
  expect(RUN_STATUS_LABEL.waiting).toBe('Waiting');
});
```

- [ ] **Step 2: Run, expect fail.** `cd /workspaces/groam/packages/ai && vp test run src/backend/runs/roster.test.ts` → FAIL (type error on `'waiting'`).
- [ ] **Step 3: Implement.**

```ts
// ids.ts
export const agentRunStatusIds = ['queued', 'running', 'waiting', 'complete', 'failed', 'aborted'] as const;
export const RUN_STATUS_LABEL = {
  aborted: 'Stopped',
  complete: 'Done',
  failed: 'Failed',
  queued: 'Queued',
  running: 'Running',
  waiting: 'Waiting'
} as const satisfies Record<AgentRunStatus, string>;
// roster.ts
export const activeAgentRunStatusIds = ['queued', 'running', 'waiting'] as const satisfies readonly AgentRunStatus[];
```

Backend `runs/index.ts`:

```ts
function isActiveRunStatus(status: Doc<'agentRuns'>['status']): boolean {
  return status === 'queued' || status === 'running' || status === 'waiting';
}
```

Use it in `activeIssueRun` and `activeProposalRun` (a waiting run still owns its issue/proposal). Leave `activeDiscussionRun` on `queued|running` (Stop in a chat stops the streaming turn, never a waiting run). `retryIssueRun`: `if (isActiveRunStatus(run.status)) throw new ConvexError('Stop this run before re-running');`. `claimTurn` (Task 1.5) additionally clears `activeWaitId` when the claimed run was `waiting`:

```ts
  const patch = {
    headline: 'Working…',
    startedAt: run.startedAt ?? now,
    status: 'running' as const,
    updatedAt: now,
    ...(run.status === 'waiting' ? { activeWaitId: undefined } : {})
  };
```

- [ ] **Step 4: Run, expect pass.** `cd /workspaces/groam/packages/ai && vp test run src/backend/runs` and `cd /workspaces/groam && vp run typecheck` → PASS (fix every flagged exhaustive map by adding `waiting` with the same treatment as `running`).

---

### Task 2.2: Waits schema, condition registry, `timer`

**Files:**
- Create: `packages/backend/convex/modules/assistant/waits/schema.ts`
- Create: `packages/backend/convex/modules/assistant/waits/conditions/types.ts`
- Create: `packages/backend/convex/modules/assistant/waits/conditions/timer.ts`
- Create: `packages/backend/convex/modules/assistant/waits/conditions/index.ts`
- Modify: `packages/backend/convex/schema.ts` (spread `agentWaitTables`)
- Modify: `packages/backend/convex/modules/assistant/runs/schema.ts` (`activeWaitId`)

**Interfaces:**
- Produces (`waits/schema.ts`): `agentWaitTables`, `AgentWaitValidators.{condition, kind, outcome, snapshot, status, view}`, types `WaitCondition`, `WaitKind`, `WaitOutcome`, `WaitSnapshot`, `WaitStatus`, `AgentWaitView`.
- Produces (`conditions/types.ts`):

```ts
export type WaitScope = {
  discussionId: Id<'discussions'> | null;
  organizationId: string;
  tripId: Id<'trips'> | null;
};
export type WaitEvaluation = {
  met: boolean;
  progress: string | null;
  snapshot: WaitSnapshot;
  summary: string;
};
export type WaitConditionDefinition<K extends WaitKind> = {
  evaluate: (ctx: QueryCtx | MutationCtx, condition: ConditionOf<K>) => Promise<WaitEvaluation>;
  kind: K;
  label: (ctx: QueryCtx | MutationCtx, condition: ConditionOf<K>) => Promise<string>;
  refId: (condition: ConditionOf<K>) => string;
  validate: (ctx: MutationCtx, condition: ConditionOf<K>, scope: WaitScope) => Promise<{ tripId: Id<'trips'> | null }>;
};
```
- Produces (`conditions/index.ts`): `evaluateCondition(ctx, condition)`, `conditionLabel(ctx, condition)`, `conditionRefId(condition)`, `validateCondition(ctx, condition, scope)`.

- [ ] **Step 1: Schema.**

```ts
// waits/schema.ts
import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';

const timerCondition = v.object({ kind: v.literal('timer') });

/** Grows one variant per kind (Chunks 3–4). Additive only. */
const condition = v.union(timerCondition);
const kind = v.union(v.literal('timer'));

const timerSnapshot = v.object({ kind: v.literal('timer') });
const snapshot = v.union(timerSnapshot);

const reason = v.union(v.literal('met'), v.literal('deadline'), v.literal('cancelled'));
const status = v.union(
  v.literal('waiting'),
  v.literal('met'),
  v.literal('expired'),
  v.literal('cancelled')
);

const outcome = v.object({
  progress: v.union(v.string(), v.null()),
  reason,
  snapshot,
  summary: v.string()
});

const view = v.object({
  deadlineAt: v.number(),
  id: v.id('agentWaits'),
  kind,
  label: v.string(),
  progress: v.union(v.string(), v.null()),
  runId: v.id('agentRuns'),
  status
});

export const AgentWaitValidators = { condition, kind, outcome, reason, snapshot, status, view };

export type WaitCondition = Infer<typeof condition>;
export type WaitKind = WaitCondition['kind'];
export type WaitOutcome = Infer<typeof outcome>;
export type WaitSnapshot = Infer<typeof snapshot>;
export type WaitStatus = Infer<typeof status>;
export type WaitReason = Infer<typeof reason>;
export type AgentWaitView = Infer<typeof view>;

export const agentWaitTables = {
  agentWaits: defineTable({
    condition,
    deadlineAt: v.number(),
    eventId: v.string(),
    kind,
    organizationId: v.string(),
    outcome: v.optional(outcome),
    /** The watched entity id, denormalized for `signal`. */
    refId: v.string(),
    resolvedAt: v.optional(v.number()),
    runId: v.id('agentRuns'),
    status,
    tripId: v.optional(v.id('trips')),
    workflowId: v.string()
  })
    .index('by_kind_and_refId_and_status', ['kind', 'refId', 'status'])
    .index('by_runId', ['runId'])
};
```

`packages/backend/convex/schema.ts`: import and spread `...agentWaitTables`. `runs/schema.ts` table: `activeWaitId: v.optional(v.id('agentWaits'))`.

- [ ] **Step 2: Types and timer.**

```ts
// conditions/types.ts
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import type { WaitCondition, WaitKind, WaitSnapshot } from '#convex/modules/assistant/waits/schema';

export type ConditionOf<K extends WaitKind> = Extract<WaitCondition, { kind: K }>;
export type WaitScope = { discussionId: Id<'discussions'> | null; organizationId: string; tripId: Id<'trips'> | null };
export type WaitEvaluation = { met: boolean; progress: string | null; snapshot: WaitSnapshot; summary: string };
export type WaitReadCtx = QueryCtx | MutationCtx;

export type WaitConditionDefinition<K extends WaitKind> = {
  evaluate: (ctx: WaitReadCtx, condition: ConditionOf<K>) => Promise<WaitEvaluation>;
  kind: K;
  label: (ctx: WaitReadCtx, condition: ConditionOf<K>) => Promise<string>;
  refId: (condition: ConditionOf<K>) => string;
  validate: (
    ctx: MutationCtx,
    condition: ConditionOf<K>,
    scope: WaitScope
  ) => Promise<{ tripId: Id<'trips'> | null }>;
};

export function defineWaitCondition<K extends WaitKind>(
  definition: WaitConditionDefinition<K>
): WaitConditionDefinition<K> {
  return definition;
}
```

```ts
// conditions/timer.ts
import { defineWaitCondition } from '#convex/modules/assistant/waits/conditions/types';

/** Met only by its deadline: "check back in N hours". */
export const timerCondition = defineWaitCondition({
  evaluate: async () => ({
    met: false,
    progress: null,
    snapshot: { kind: 'timer' },
    summary: 'Timer elapsed'
  }),
  kind: 'timer',
  label: async () => 'a timer',
  refId: () => 'timer',
  validate: async (_ctx, _condition, scope) => ({ tripId: scope.tripId })
});
```

```ts
// conditions/index.ts
import type { MutationCtx } from '#convex-generated/server';
import { timerCondition } from '#convex/modules/assistant/waits/conditions/timer';
import type {
  WaitConditionDefinition,
  WaitEvaluation,
  WaitReadCtx,
  WaitScope
} from '#convex/modules/assistant/waits/conditions/types';
import type { WaitCondition, WaitKind } from '#convex/modules/assistant/waits/schema';

/** One definition per kind. Outside this folder, use the functions below, never the map. */
const waitConditionKinds = {
  timer: timerCondition
} satisfies { [K in WaitKind]: WaitConditionDefinition<K> };

function definitionFor(condition: WaitCondition): WaitConditionDefinition<WaitKind> {
  return waitConditionKinds[condition.kind] as unknown as WaitConditionDefinition<WaitKind>;
}

export function conditionRefId(condition: WaitCondition): string {
  return definitionFor(condition).refId(condition as never);
}

export async function evaluateCondition(
  ctx: WaitReadCtx,
  condition: WaitCondition
): Promise<WaitEvaluation> {
  return await definitionFor(condition).evaluate(ctx, condition as never);
}

export async function conditionLabel(ctx: WaitReadCtx, condition: WaitCondition): Promise<string> {
  return await definitionFor(condition).label(ctx, condition as never);
}

export async function validateCondition(
  ctx: MutationCtx,
  condition: WaitCondition,
  scope: WaitScope
) {
  return await definitionFor(condition).validate(ctx, condition as never, scope);
}
```

- [ ] **Step 3: Codegen + typecheck.** `cd /workspaces/groam && just codegen && cd packages/backend && vp run typecheck` → PASS. (Behavior tests come with the facade in Task 2.3.)

---

### Task 2.3: `AgentWaits` facade and internal functions

**Files:**
- Create: `packages/backend/convex/modules/assistant/waits/index.ts`
- Create: `packages/backend/convex/modules/assistant/waits/functions.ts`
- Create: `packages/backend/convex/modules/assistant/waits/waits.test.ts`

**Interfaces:**
- Produces (`AgentWaits` static facade):

```ts
create(ctx: MutationCtx, input: { condition: WaitCondition; deadlineAt: number; runId: Id<'agentRuns'> }): Promise<{ eventId: string; status: 'met' | 'waiting'; waitId: Id<'agentWaits'> }>;
signal(ctx: MutationCtx, input: { deleted?: boolean; kind: WaitKind; refId: string }): Promise<number>; // resolved count
cancel(ctx: MutationCtx, input: { notify: boolean; reason: string; waitId: Id<'agentWaits'> }): Promise<boolean>;
expire(ctx: MutationCtx, waitId: Id<'agentWaits'>): Promise<boolean>;
present(ctx: QueryCtx | MutationCtx, wait: Doc<'agentWaits'>): Promise<AgentWaitView>;
pendingForDiscussion(ctx: QueryCtx, discussionId: Id<'discussions'>): Promise<AgentWaitView[]>;
MAX_WAIT_MS: number; // 14 days
```
- Produces internal functions (`waits/functions.ts`): `expire` (internalMutation `{ waitId }`), `createForRun` (internalWorkspaceMutation `{ condition, deadlineAt }` → `{ eventId, status, waitId }`), `cancelForRun` (internalWorkspaceMutation `{ waitId }` → `null`), `pendingForThread` (internalQuery `{ threadId }` → `AgentWaitView[]`), `resumeContext` (internalQuery `{ waitId }` → `{ kind; label; outcome: WaitOutcome | null }`).

- [ ] **Step 1: Failing tests.** `waits/waits.test.ts`:

```ts
import { cancel, getStatus, start } from '@convex-dev/workflow';
import { makeFunctionReference } from 'convex/server';
import { expect, test } from 'vite-plus/test';
import { components, internal } from '#convex-generated/api';
import { agentWorkflow } from '#convex/modules/assistant/engine/manager';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { setupTrip } from '#testing/trips';

const HOUR = 60 * 60 * 1000;

// oxlint-disable-next-line jest/no-export -- convex-test discovers test-only functions through module exports.
export const idle = agentWorkflow.define({ args: {} }).handler(async (step): Promise<void> => {
  await step.sleep(24 * HOUR);
});
// Test files are not in the generated api; address the test workflow by path.
const idleWorkflow = makeFunctionReference<'mutation'>('modules/assistant/waits/waits.test:idle');

/** A run mid-turn with a real (idle) workflow so createEvent/sendEvent have a target. */
async function runningWorkflowRun() {
  const trip = await setupTrip(0);
  const runId = await trip.owner.test.run(async (ctx) => {
    const id = await ctx.db.insert('agentRuns', {
      actorTokenIdentifier: 'issuer|owner',
      agentId: 'issue',
      createdBy: { name: 'Owner', userId: trip.owner.userId },
      kickoff: 'assign',
      organizationId: trip.owner.organizationId as string,
      shortId: `wait${Math.random().toString(36).slice(2, 6)}`,
      status: 'running',
      surface: 'standalone',
      title: 'Wait',
      tripId: trip.tripId,
      updatedAt: Date.now()
    });
    const workflowId = await start(ctx, idleWorkflow as never, {});
    await ctx.db.patch('agentRuns', id, { workflowId });
    return id;
  });
  return { ...trip, runId };
}

async function createTimer(trip: Awaited<ReturnType<typeof runningWorkflowRun>>, deadlineAt: number) {
  return await trip.owner.test.run((ctx) =>
    AgentWaits.create(ctx, { condition: { kind: 'timer' }, deadlineAt, runId: trip.runId })
  );
}

test('a timer wait needs a deadline in the next 14 days', async () => {
  const trip = await runningWorkflowRun();
  await expect(createTimer(trip, Date.now() - 1)).rejects.toThrow('deadline in the future');
  await expect(createTimer(trip, Date.now() + 15 * 24 * HOUR)).rejects.toThrow('at most 14 days');
  const created = await createTimer(trip, Date.now() + HOUR);
  expect(created.status).toBe('waiting');
  await trip.owner.test.run(async (ctx) => {
    expect((await ctx.db.get('agentRuns', trip.runId))?.activeWaitId).toBe(created.waitId);
    const jobs = await ctx.db.system.query('_scheduled_functions').collect();
    expect(jobs.some((job) => job.name.includes('waits/functions') && job.args[0]?.waitId === created.waitId)).toBe(true);
  });
});

test('a run can hold only one active wait', async () => {
  const trip = await runningWorkflowRun();
  await createTimer(trip, Date.now() + HOUR);
  await expect(createTimer(trip, Date.now() + HOUR)).rejects.toThrow('already waiting');
});

test('the deadline expires a waiting timer once; a second expiry is a no-op', async () => {
  const trip = await runningWorkflowRun();
  const { waitId } = await createTimer(trip, Date.now() + HOUR);
  await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, { waitId });
  await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, { waitId });
  await trip.owner.test.run(async (ctx) => {
    expect(await ctx.db.get('agentWaits', waitId)).toMatchObject({
      outcome: { reason: 'deadline', summary: 'Timer elapsed' },
      status: 'expired'
    });
  });
});

test('cancel resolves with cancelled; signal for another ref touches nothing', async () => {
  const trip = await runningWorkflowRun();
  const { waitId } = await createTimer(trip, Date.now() + HOUR);
  const resolved = await trip.owner.test.run((ctx) => AgentWaits.signal(ctx, { kind: 'timer', refId: 'other' }));
  expect(resolved).toBe(0);
  await trip.owner.test.run((ctx) => AgentWaits.cancel(ctx, { notify: true, reason: 'No longer needed', waitId }));
  await trip.owner.test.run(async (ctx) => {
    expect(await ctx.db.get('agentWaits', waitId)).toMatchObject({
      outcome: { reason: 'cancelled', summary: 'Cancelled: No longer needed' },
      status: 'cancelled'
    });
  });
});

test('a wait on a finished workflow stays resolved when the event cannot be delivered', async () => {
  const trip = await runningWorkflowRun();
  const { waitId } = await createTimer(trip, Date.now() + HOUR);
  const run = await trip.owner.test.run((ctx) => ctx.db.get('agentRuns', trip.runId));
  await trip.owner.test.run((ctx) => cancel(ctx, components.workflow, run?.workflowId as never));
  await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, { waitId });
  expect((await trip.owner.test.run((ctx) => ctx.db.get('agentWaits', waitId)))?.status).toBe('expired');
  expect(
    (await trip.owner.test.run((ctx) => getStatus(ctx, components.workflow, run?.workflowId as never))).type
  ).toBe('canceled');
});

test('the tool entry point refuses callers that are not an agent run', async () => {
  const trip = await runningWorkflowRun();
  await expect(
    trip.owner.client.mutation(internal.modules.assistant.waits.functions.createForRun, {
      condition: { kind: 'timer' },
      deadlineAt: Date.now() + HOUR
    })
  ).rejects.toThrow('Only an agent run can wait');
});
```

- [ ] **Step 2: Run, expect fail.** `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant/waits/waits.test.ts` → FAIL (`AgentWaits` missing).
- [ ] **Step 3: `waits/index.ts`.**

```ts
import { createEvent, type EventId, sendEvent, type WorkflowId } from '@convex-dev/workflow';
import { ConvexError } from 'convex/values';
import { components, internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { waitResumeValidator } from '#convex/modules/assistant/engine/schema';
import {
  conditionLabel,
  conditionRefId,
  evaluateCondition,
  validateCondition
} from '#convex/modules/assistant/waits/conditions/index';
import type { WaitEvaluation } from '#convex/modules/assistant/waits/conditions/types';
import type {
  AgentWaitView,
  WaitCondition,
  WaitKind,
  WaitReason
} from '#convex/modules/assistant/waits/schema';

const MAX_WAIT_MS = 14 * 24 * 60 * 60 * 1000;
const SIGNAL_BATCH = 50;
const SUMMARY_LIMIT = 500;

const statusFor = { cancelled: 'cancelled', deadline: 'expired', met: 'met' } as const;

async function resolve(
  ctx: MutationCtx,
  waitId: Id<'agentWaits'>,
  reason: WaitReason,
  evaluation: WaitEvaluation,
  notify = true
): Promise<boolean> {
  const wait = await ctx.db.get('agentWaits', waitId);
  // The status check makes resolution idempotent: OCC serializes concurrent resolvers.
  if (!wait || wait.status !== 'waiting') return false;
  await ctx.db.patch('agentWaits', waitId, {
    outcome: {
      progress: evaluation.progress,
      reason,
      snapshot: evaluation.snapshot,
      summary: evaluation.summary.slice(0, SUMMARY_LIMIT)
    },
    resolvedAt: Date.now(),
    status: statusFor[reason]
  });
  if (!notify) return true;
  try {
    await sendEvent(ctx, components.workflow, {
      id: wait.eventId as EventId,
      validator: waitResumeValidator,
      value: { reason, waitId }
    });
  } catch (error: unknown) {
    // The workflow already finished (stopped, failed). The wait stays resolved.
    console.error('agent wait event not delivered:', waitId, error);
  }
  return true;
}

async function create(
  ctx: MutationCtx,
  { condition, deadlineAt, runId }: { condition: WaitCondition; deadlineAt: number; runId: Id<'agentRuns'> }
) {
  const run = await ctx.db.get('agentRuns', runId);
  if (!run || run.status !== 'running' || !run.workflowId) {
    throw new ConvexError('Only a running agent run can wait');
  }
  if (run.activeWaitId) {
    const active = await ctx.db.get('agentWaits', run.activeWaitId);
    if (active?.status === 'waiting') throw new ConvexError('This run is already waiting');
  }
  const now = Date.now();
  if (!Number.isFinite(deadlineAt) || deadlineAt <= now) {
    throw new ConvexError('A wait needs a deadline in the future');
  }
  if (deadlineAt - now > MAX_WAIT_MS) {
    throw new ConvexError('A wait deadline can be at most 14 days away');
  }
  const { tripId } = await validateCondition(ctx, condition, {
    discussionId: run.discussionId ?? null,
    organizationId: run.organizationId,
    tripId: run.tripId ?? null
  });
  const eventId = await createEvent(ctx, components.workflow, {
    name: `wait:${condition.kind}`,
    workflowId: run.workflowId as WorkflowId
  });
  const waitId = await ctx.db.insert('agentWaits', {
    condition,
    deadlineAt,
    eventId,
    kind: condition.kind,
    organizationId: run.organizationId,
    refId: conditionRefId(condition),
    runId,
    status: 'waiting',
    ...(tripId ? { tripId } : {}),
    workflowId: run.workflowId
  });
  await ctx.db.patch('agentRuns', runId, { activeWaitId: waitId, updatedAt: now });
  await ctx.scheduler.runAt(deadlineAt, internal.modules.assistant.waits.functions.expire, { waitId });
  const evaluation = await evaluateCondition(ctx, condition);
  if (evaluation.met) await resolve(ctx, waitId, 'met', evaluation);
  return { eventId: eventId as string, status: evaluation.met ? ('met' as const) : ('waiting' as const), waitId };
}

async function signal(
  ctx: MutationCtx,
  { deleted = false, kind, refId }: { deleted?: boolean; kind: WaitKind; refId: string }
): Promise<number> {
  const waits = await ctx.db
    .query('agentWaits')
    .withIndex('by_kind_and_refId_and_status', (query) =>
      query.eq('kind', kind).eq('refId', refId).eq('status', 'waiting')
    )
    .take(SIGNAL_BATCH);
  let resolved = 0;
  for (const wait of waits) {
    if (deleted) {
      const evaluation = await evaluateCondition(ctx, wait.condition);
      const removed = { ...evaluation, summary: `Cancelled: the watched ${kind} was deleted` };
      if (await resolve(ctx, wait._id, 'cancelled', removed)) resolved += 1;
      continue;
    }
    const evaluation = await evaluateCondition(ctx, wait.condition);
    if (evaluation.met && (await resolve(ctx, wait._id, 'met', evaluation))) resolved += 1;
  }
  return resolved;
}

async function cancel(
  ctx: MutationCtx,
  { notify, reason, waitId }: { notify: boolean; reason: string; waitId: Id<'agentWaits'> }
): Promise<boolean> {
  const wait = await ctx.db.get('agentWaits', waitId);
  if (!wait || wait.status !== 'waiting') return false;
  const evaluation = await evaluateCondition(ctx, wait.condition);
  return await resolve(ctx, waitId, 'cancelled', { ...evaluation, summary: `Cancelled: ${reason}` }, notify);
}

/** Deadline handler body: a fresh snapshot, then `expired`. No-op once resolved. */
async function expire(ctx: MutationCtx, waitId: Id<'agentWaits'>): Promise<boolean> {
  const wait = await ctx.db.get('agentWaits', waitId);
  if (!wait || wait.status !== 'waiting') return false;
  return await resolve(ctx, waitId, 'deadline', await evaluateCondition(ctx, wait.condition));
}

async function present(ctx: QueryCtx | MutationCtx, wait: Doc<'agentWaits'>): Promise<AgentWaitView> {
  const live = wait.status === 'waiting' ? await evaluateCondition(ctx, wait.condition) : null;
  return {
    deadlineAt: wait.deadlineAt,
    id: wait._id,
    kind: wait.kind,
    label: await conditionLabel(ctx, wait.condition),
    progress: live?.progress ?? wait.outcome?.progress ?? null,
    runId: wait.runId,
    status: wait.status
  };
}

async function pendingForDiscussion(ctx: QueryCtx, discussionId: Id<'discussions'>) {
  const runs = await ctx.db
    .query('agentRuns')
    .withIndex('by_discussionId_and_status_and_updatedAt', (query) =>
      query.eq('discussionId', discussionId).eq('status', 'waiting')
    )
    .take(20);
  const waits = await Promise.all(
    runs.map((run) => (run.activeWaitId ? ctx.db.get('agentWaits', run.activeWaitId) : null))
  );
  return await Promise.all(
    waits.flatMap((wait) => (wait?.status === 'waiting' ? [present(ctx, wait)] : []))
  );
}

/** Durable waits that suspend an agent run until a condition or deadline. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class AgentWaits {
  static MAX_WAIT_MS = MAX_WAIT_MS;
  static cancel = cancel;
  static create = create;
  static expire = expire;
  static pendingForDiscussion = pendingForDiscussion;
  static present = present;
  static signal = signal;
}
```

- [ ] **Step 4: `waits/functions.ts`.**

```ts
import { ConvexError, v } from 'convex/values';
import { internalMutation, internalQuery } from '#convex-generated/server';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { conditionLabel } from '#convex/modules/assistant/waits/conditions/index';
import { AgentWaitValidators } from '#convex/modules/assistant/waits/schema';
import { internalWorkspaceMutation } from '#convex/modules/auth/workspace';

export const expire = internalMutation({
  args: { waitId: v.id('agentWaits') },
  returns: v.null(),
  handler: async (ctx, { waitId }) => {
    await AgentWaits.expire(ctx, waitId);
    return null;
  }
});

export const createForRun = internalWorkspaceMutation({
  args: { condition: AgentWaitValidators.condition, deadlineAt: v.number() },
  returns: v.object({
    eventId: v.string(),
    status: v.union(v.literal('met'), v.literal('waiting')),
    waitId: v.id('agentWaits')
  }),
  handler: async (ctx, { condition, deadlineAt }) => {
    const runId = ctx.workspace.runId;
    if (!runId) throw new ConvexError('Only an agent run can wait');
    return await AgentWaits.create(ctx, { condition, deadlineAt, runId });
  }
});

/** cancelWait: the run's own wait, or a pending wait of another run in the same discussion. */
export const cancelForRun = internalWorkspaceMutation({
  args: { waitId: v.id('agentWaits') },
  returns: v.null(),
  handler: async (ctx, { waitId }) => {
    const runId = ctx.workspace.runId;
    if (!runId) throw new ConvexError('Only an agent run can cancel a wait');
    const [wait, current] = await Promise.all([ctx.db.get('agentWaits', waitId), ctx.db.get('agentRuns', runId)]);
    const owner = wait ? await ctx.db.get('agentRuns', wait.runId) : null;
    const sameRun = wait?.runId === runId;
    const sameThread = Boolean(current?.discussionId) && owner?.discussionId === current?.discussionId;
    if (!wait || !(sameRun || sameThread)) throw new ConvexError('Wait not found');
    await AgentWaits.cancel(ctx, { notify: true, reason: 'cancelled by the agent', waitId });
    return null;
  }
});

export const pendingForThread = internalQuery({
  args: { threadId: v.string() },
  returns: v.array(AgentWaitValidators.view),
  handler: async (ctx, { threadId }) => {
    const discussion = await ctx.db
      .query('discussions')
      .withIndex('by_threadId', (query) => query.eq('threadId', threadId))
      .unique();
    return discussion ? await AgentWaits.pendingForDiscussion(ctx, discussion._id) : [];
  }
});

export const resumeContext = internalQuery({
  args: { waitId: v.id('agentWaits') },
  returns: v.union(
    v.object({ kind: AgentWaitValidators.kind, label: v.string(), outcome: v.union(AgentWaitValidators.outcome, v.null()) }),
    v.null()
  ),
  handler: async (ctx, { waitId }) => {
    const wait = await ctx.db.get('agentWaits', waitId);
    if (!wait) return null;
    return { kind: wait.kind, label: await conditionLabel(ctx, wait.condition), outcome: wait.outcome ?? null };
  }
});
```

- [ ] **Step 5: Run, expect pass.** `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant/waits/waits.test.ts` → PASS.

---

### Task 2.4: Engine suspends on a wait and resumes with the outcome

**Files:**
- Modify: `packages/backend/convex/modules/assistant/engine/turns.ts`
- Modify: `packages/backend/convex/modules/assistant/engine/functions.ts` (add `suspend`; `onComplete` closes active wait)
- Modify: `packages/backend/convex/modules/assistant/engine/index.ts` (`cancelRun` cancels the active wait first)
- Modify: `packages/backend/convex/modules/assistant/engine/schema.ts` (`resumeNote`, `isConnectionError`)
- Modify: `packages/backend/convex/modules/assistant/agent/session.ts` (`saveResumeNote`, stop condition, pending-wait guidance)
- Modify: `packages/backend/convex/modules/assistant/standalone/session.ts` (`turn(ctx, run, resumeNote?)`, stop condition)
- Modify: `packages/backend/convex/modules/discussions/threads/index.ts` (`finishAssistantResponse` option `finishRun`)
- Create: `packages/backend/assistant/tools/agent/stop.ts`
- Create: `packages/backend/convex/modules/assistant/engine/resume.test.ts`

**Interfaces:**
- Produces: `internal.modules.assistant.engine.functions.suspend` (`{ runId }` → `{ eventId: string } | null`).
- Produces: `stopAfterWait: StopCondition<ToolSet>` from `#backend/assistant/tools/agent/stop`.
- Produces: `resumeNote(input: { kind: WaitKind; outcome: WaitOutcome }): string`.
- Produces: `Discussions.finishAssistantResponse(ctx, { …, finishRun?: boolean })` (default `true`).

- [ ] **Step 1: Failing tests.** `engine/resume.test.ts`:

```ts
import { mockModel } from '@convex-dev/agent';
import { listSteps } from '@convex-dev/workflow';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, components, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { setupTrip } from '#testing/trips';
import { runUntil } from '#testing/workflows';

vi.useRealTimers();
afterEach(() => vi.restoreAllMocks());

function waitThenReply(reply: string) {
  return mockModel({
    contentSteps: [
      [{ input: JSON.stringify({ condition: { kind: 'timer' }, deadlineHours: 2 }), toolCallId: 'wait-1', toolName: 'waitFor', type: 'tool-call' as const }],
      [{ text: reply, type: 'text' as const }]
    ]
  });
}

async function issueRun() {
  const trip = await setupTrip(0);
  const issueId = await trip.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Check back on flights tomorrow.',
    title: 'Flight prices',
    tripId: trip.tripId
  });
  const runId = await trip.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' },
    issueId
  });
  if (!runId) throw new Error('Expected a run');
  const read = () => trip.owner.test.run((ctx) => ctx.db.get('agentRuns', runId));
  return { ...trip, read, runId };
}

test('a timer wait suspends the run and its deadline resumes the same run', async () => {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({ languageModel: waitThenReply('Prices dropped; booked.'), modelId: 'm' } as never);
  const trip = await issueRun();
  await runUntil(trip.owner.test, async () => (await trip.read())?.status === 'waiting');
  const waiting = await trip.read();
  const waitId = waiting?.activeWaitId as Id<'agentWaits'>;
  await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, { waitId });
  await runUntil(trip.owner.test, async () => (await trip.read())?.status === 'complete');
  expect(await trip.read()).toMatchObject({ report: 'Prices dropped; booked.', status: 'complete' });
  const steps = await trip.owner.test.run((ctx) => listSteps(ctx, components.workflow, waiting?.workflowId as never));
  // Review Focus 1: the journal shape a resumed run replays.
  expect(steps.page.map((step) => step.kind)).toEqual(['function', 'event', 'function']);
  expect(steps.page[0]?.name).toBe('modules/assistant/engine/turn:run');
  expect(steps.page[2]?.name).toBe('modules/assistant/engine/turn:run');
});

test('a resume with a disconnected ChatGPT fails the run with a reconnect event', async () => {
  const configured = vi.spyOn(AssistantProvider, 'configured');
  configured.mockResolvedValueOnce({ languageModel: waitThenReply('unused'), modelId: 'm' } as never);
  configured.mockRejectedValue(new Error('Connect ChatGPT in Settings → AI to use your ChatGPT plan.'));
  const trip = await issueRun();
  await runUntil(trip.owner.test, async () => (await trip.read())?.status === 'waiting');
  const waitId = (await trip.read())?.activeWaitId as Id<'agentWaits'>;
  await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, { waitId });
  await runUntil(trip.owner.test, async () => (await trip.read())?.status === 'failed');
  const events = await trip.owner.test.run((ctx) =>
    ctx.db.query('agentRunEvents').withIndex('by_runId_and_seq', (query) => query.eq('runId', trip.runId)).collect()
  );
  expect(events.map((event) => event.label)).toContain('Reconnect ChatGPT to continue');
});

test('stopping a waiting run cancels its wait without resuming it', async () => {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({ languageModel: waitThenReply('unused'), modelId: 'm' } as never);
  const trip = await issueRun();
  await runUntil(trip.owner.test, async () => (await trip.read())?.status === 'waiting');
  const waitId = (await trip.read())?.activeWaitId as Id<'agentWaits'>;
  await trip.owner.client.mutation(api.routes.agents.runs.stop.run, { runId: trip.runId });
  await runUntil(trip.owner.test, async () => (await trip.read())?.completedAt !== undefined);
  expect((await trip.read())?.status).toBe('aborted');
  expect((await trip.owner.test.run((ctx) => ctx.db.get('agentWaits', waitId)))?.status).toBe('cancelled');
});
```

- [ ] **Step 2: Run, expect fail.** `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant/engine/resume.test.ts` → FAIL (`waitFor` tool unknown → the mock tool call errors; no `waiting` status). Task 2.5 adds the tool; implement both before re-running.
- [ ] **Step 3: Engine helpers in `engine/schema.ts`.**

```ts
import type { WaitKind, WaitOutcome } from '#convex/modules/assistant/waits/schema';

const notePrefix = { cancelled: 'Wait cancelled', deadline: 'Wait expired', met: 'Wait met' } as const;

/** Hidden system note that tells the model why it woke up. */
export function resumeNote({ kind, outcome }: { kind: WaitKind; outcome: WaitOutcome }): string {
  if (kind === 'timer' && outcome.reason === 'deadline') return 'Wait met: timer elapsed. Continue the task.';
  return `${notePrefix[outcome.reason]}: ${outcome.summary}. Continue the task with this outcome.`;
}

const CONNECTION_ERRORS = ['Connect ChatGPT', 'Select an available ChatGPT model', 'ChatGPT plan usage is unavailable'];
export function isConnectionError(message: string): boolean {
  return CONNECTION_ERRORS.some((prefix) => message.includes(prefix));
}
```

- [ ] **Step 4: `suspend` and wait-aware completion in `engine/functions.ts`.**

```ts
/**
 * The turn ended with an active wait: mark the run `waiting`, complete the chat request so the
 * thread is not stuck "responding", and hand the event id to the workflow.
 */
export const suspend = internalMutation({
  args: { runId: v.id('agentRuns') },
  returns: v.union(v.object({ eventId: v.string() }), v.null()),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get('agentRuns', runId);
    if (!run?.activeWaitId || run.status !== 'running') return null;
    const wait = await ctx.db.get('agentWaits', run.activeWaitId);
    if (!wait) return null;
    const label = await conditionLabel(ctx, wait.condition);
    if (run.discussionId && run.promptMessageId) {
      await Discussions.finishAssistantResponse(ctx, {
        discussionId: run.discussionId,
        expectedUpdatedAt: run.discussionUpdatedAt ?? 0,
        finishRun: false,
        promptMessageId: run.promptMessageId,
        responseText: run.report?.trim() || `Waiting for ${label}.`,
        runId
      });
    }
    await ctx.db.patch('agentRuns', runId, {
      headline: `Waiting for ${label}`,
      promptMessageId: undefined,
      status: 'waiting',
      updatedAt: Date.now()
    });
    return { eventId: wait.eventId };
  }
});
```

`onComplete`: before finishing, `if (run.activeWaitId) await AgentWaits.cancel(ctx, { notify: false, reason: 'the run ended', waitId: run.activeWaitId });`. `claimTurn` returns `null` for `waiting` runs only if they were stopped (status is terminal) — unchanged logic covers it.

`Discussions.finishAssistantResponse` gains `finishRun = true`; wrap the `AgentRuns.finish(...)` call in `if (finishRun)`.

- [ ] **Step 5: `AgentEngine.cancel` closes the active wait first.**

```ts
async function cancelRun(ctx: MutationCtx, run: Doc<'agentRuns'>): Promise<null> {
  if (run.activeWaitId) {
    await AgentWaits.cancel(ctx, { notify: false, reason: 'the run was stopped', waitId: run.activeWaitId });
  }
  if (!run.workflowId) return null;
  // … unchanged
}
```

`stopRun` and `abortActiveRun` also accept `waiting` (`if (!isActiveRunStatus(run.status)) return null;` in `abortActiveRun`; `stopRun` already uses `finish`, which only skips terminal statuses).

- [ ] **Step 6: Stop condition.** `packages/backend/assistant/tools/agent/stop.ts`:

```ts
import type { StopCondition, ToolSet } from 'ai';

/** Ends the generation right after a tool reports that the run is now waiting. */
export const stopAfterWait: StopCondition<ToolSet> = ({ steps }) =>
  steps.at(-1)?.toolResults.some(
    (result) => typeof result.output === 'object' && result.output !== null && (result.output as { wait?: unknown }).wait === true
  ) ?? false;
```

In `agent/session.ts` `createAssistant`: `stopWhen: [stepCountIs(8), stopAfterWait]`; in `standalone/session.ts` `generateStandalone`: `stopWhen: [stepCountIs(12), stopAfterWait]`.

- [ ] **Step 7: Resume in the session.** `agent/session.ts`:

```ts
import { saveMessage } from '@convex-dev/agent';

  /** Writes the hidden resume note; returns its message id to use as the prompt. */
  static async saveResumeNote(ctx: ActionCtx, threadId: string, note: string): Promise<string> {
    const { messageId } = await saveMessage(ctx, components.agent, {
      message: { content: note, role: 'system' },
      threadId
    });
    return messageId;
  }
```

Discussion UI already renders only `user`/`assistant` roles (`discussion-thread-body.tsx:54`), so the note stays hidden. `createAssistant` gains `pendingWaits: AgentWaitView[]`; when non-empty it pushes one guidance line:

```ts
const pendingWaitGuidance = (waits: AgentWaitView[]) =>
  `Pending waits in this chat (another run is waiting; mention them if relevant, cancel with cancelWait if they are no longer needed): ${waits
    .map((wait) => `${wait.id} waits for ${wait.label}${wait.progress ? ` (${wait.progress})` : ''} until ${new Date(wait.deadlineAt).toISOString()}`)
    .join('; ')}`;
```

`continueAssistantWithConfiguration` loads them with `ctx.runQuery(internal.modules.assistant.waits.functions.pendingForThread, { threadId: target.threadId })` when `options.scope === 'discussion'`.

`standalone/session.ts`: `turn(ctx, run, resumeNote?: string)`; `executeIssue` builds `const prompt = resumeNote ? `${issueStandalonePrompt(issue)}\n\n${resumeNote}\n\nYour report so far: ${run.report ?? 'none'}` : issueStandalonePrompt(issue);` (same for review). Clear the "report must not be empty" check only when `resumeNote` is absent? No — keep it.

- [ ] **Step 8: `engine/turns.ts` wait/resume branches.** Replace `run`:

```ts
async function noteFor(ctx: ActionCtx, resume: WaitResume | undefined): Promise<string | null> {
  if (!resume) return null;
  const context = await ctx.runQuery(internal.modules.assistant.waits.functions.resumeContext, {
    waitId: resume.waitId as Id<'agentWaits'>
  });
  if (!context?.outcome) return `Wait ${resume.reason}. Continue the task.`;
  return resumeNote({ kind: context.kind, outcome: context.outcome });
}

async function run(ctx: ActionCtx, { resume, runId }: { resume?: WaitResume; runId: Id<'agentRuns'> }): Promise<TurnResult> {
  const claimed = await ctx.runMutation(internal.modules.assistant.engine.functions.claimTurn, { runId });
  if (!claimed) return { kind: 'aborted' };
  const note = await noteFor(ctx, resume);
  try {
    const result =
      claimed.surface === 'chat' ? await chatTurn(ctx, claimed, note) : await standaloneTurn(ctx, claimed, note);
    if (result.kind !== 'done') return result;
    const suspended = await ctx.runMutation(internal.modules.assistant.engine.functions.suspend, { runId });
    return suspended ? { eventId: suspended.eventId, kind: 'wait' } : result;
  } catch (error: unknown) {
    if (await AgentRunTracking.isAborted(ctx, runId)) return { kind: 'aborted' };
    const message = AssistantErrors.message(error);
    const reconnect = note !== null && isConnectionError(message);
    console.error(claimed.surface === 'chat' ? 'discussion assistant respond failed:' : 'standalone agent run failed:', message, error);
    await AgentRunTracking.record(ctx, runId, {
      detail: message,
      kind: 'error',
      label: reconnect ? RECONNECT_CHATGPT_LABEL : 'Run failed'
    });
    return { error: reconnect ? RECONNECT_CHATGPT_LABEL : message, kind: 'failed' };
  }
}
```

`chatTurn(ctx, run, note)`: when `note` is set, `const promptMessageId = await AssistantSession.saveResumeNote(ctx, run.threadId, note)` and call `continueDiscussion` with `{ agent: run.agentId as ChatAgentId, prompt: note, screen: stored.screen, threadId: run.threadId }` and that id (no `discussionMessages` lookup; `promptMessageId` was cleared by `suspend`). `standaloneTurn(ctx, run, note)` passes `note ?? undefined` to `StandaloneSession.turn`.

- [ ] **Step 9: Run, expect pass** (after Task 2.5 Steps 3–4). `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant` → PASS.

---

### Task 2.5: `waitFor` and `cancelWait` tools

**Files:**
- Modify: `packages/ai/src/tools/specs.ts` (two entries at the top of `assistantToolSpecs`)
- Modify: `packages/ai/src/tools/specs.test.ts:43-75` (issue worker oracle)
- Create: `packages/backend/assistant/tools/agent/waits.ts`
- Create: `packages/backend/assistant/tools/agent/waits.test.ts`
- Modify: `packages/backend/assistant/tools/kinds/index.ts` (two bindings)

**Interfaces:**
- Produces capabilities `'agent.wait.cancel'` (`cancelWait`) and `'agent.wait.create'` (`waitFor`), agents `['groam', 'issue']`.
- Produces: `createWaitForTool(): AssistantTool`, `createCancelWaitTool(): AssistantTool`; output `{ status: 'met' | 'waiting'; wait: true; waitId }` / `{ cancelled: true; waitId }`.

- [ ] **Step 1: Failing tests.** `specs.test.ts` oracle for `issue` becomes `['agent.wait.cancel', 'agent.wait.create', 'context.screen.read', …unchanged…]`. `assistant/tools/agent/waits.test.ts`:

```ts
import { expect, test, vi } from 'vite-plus/test';

vi.mock('@convex-dev/agent', () => ({ createTool: <Definition>(definition: Definition) => definition }));

import { createCancelWaitTool, createWaitForTool } from '#backend/assistant/tools/agent/waits';

type Executable = { execute: (ctx: unknown, input: unknown) => Promise<unknown> };

test('waitFor turns hours into an absolute deadline and reports a wait', async () => {
  vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));
  const calls: unknown[] = [];
  const tool = createWaitForTool() as unknown as Executable;
  const output = await tool.execute(
    { runMutation: async (_ref: unknown, args: unknown) => { calls.push(args); return { eventId: 'e', status: 'waiting', waitId: 'w' }; } },
    { condition: { kind: 'timer' }, deadlineHours: 2 }
  );
  expect(calls).toEqual([{ condition: { kind: 'timer' }, deadlineAt: Date.parse('2026-10-17T12:00:00Z') }]);
  expect(output).toEqual({ status: 'waiting', wait: true, waitId: 'w' });
  vi.useRealTimers();
});

test('cancelWait forwards the wait id', async () => {
  const calls: unknown[] = [];
  const tool = createCancelWaitTool() as unknown as Executable;
  await expect(
    tool.execute({ runMutation: async (_ref: unknown, args: unknown) => { calls.push(args); return null; } }, { waitId: 'w' })
  ).resolves.toEqual({ cancelled: true, waitId: 'w' });
  expect(calls).toEqual([{ waitId: 'w' }]);
});
```

- [ ] **Step 2: Run, expect fail.** `cd /workspaces/groam/packages/ai && vp test run src/tools/specs.test.ts` and `cd /workspaces/groam/packages/backend && vp test run assistant/tools/agent/waits.test.ts` → FAIL.
- [ ] **Step 3: Specs.** Insert first in `assistantToolSpecs`:

```ts
  'agent.wait.cancel': {
    agents: ['groam', 'issue'],
    eventLabel: { complete: 'Cancelled a wait', running: 'Cancelling a wait' },
    guidance:
      'Use cancelWait when a pending wait listed for this chat or run is no longer needed, for example the group already decided in conversation.',
    id: 'agent.wait.cancel',
    toolName: 'cancelWait',
    ui: { card: 'activity' }
  },
  'agent.wait.create': {
    agents: ['groam', 'issue'],
    eventLabel: { complete: 'Started waiting', running: 'Setting up a wait' },
    guidance:
      'Use waitFor when you cannot finish until something happens later: a timer to check back, or (when available) a poll, issue, idea, or RSVP condition. Always choose a sensible deadline (at most 14 days). After calling it, stop; you resume automatically with the outcome.',
    id: 'agent.wait.create',
    toolName: 'waitFor',
    ui: { card: 'activity' }
  },
```

- [ ] **Step 4: Tools.** `assistant/tools/agent/waits.ts`:

```ts
import { createTool } from '@convex-dev/agent';
import * as z from 'zod/v3';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

const HOUR_MS = 60 * 60 * 1000;

/** Grows one variant per wait kind (Chunks 3–4). */
export const waitConditionInputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('timer') }).describe('Resume when the deadline passes.')
]);

export const deadlineHoursField = z
  .number()
  .min(0.05)
  .max(336)
  .describe('Hours from now until the deadline (max 336 = 14 days). The run resumes then even if the condition is not met.');

export function createWaitForTool() {
  return createTool({
    description:
      'Suspend this run until a condition is met or the deadline passes. Stop after calling it; the run resumes in this same conversation with the outcome.',
    execute: async (toolCtx, input) => {
      const created = await toolCtx.runMutation(internal.modules.assistant.waits.functions.createForRun, {
        condition: input.condition,
        deadlineAt: Date.now() + input.deadlineHours * HOUR_MS
      });
      return { status: created.status, wait: true as const, waitId: created.waitId };
    },
    inputSchema: z.object({ condition: waitConditionInputSchema, deadlineHours: deadlineHoursField })
  });
}

export function createCancelWaitTool() {
  return createTool({
    description: 'Cancel a pending wait of this run or of another run in this chat.',
    execute: async (toolCtx, input) => {
      await toolCtx.runMutation(internal.modules.assistant.waits.functions.cancelForRun, {
        waitId: input.waitId as Id<'agentWaits'>
      });
      return { cancelled: true as const, waitId: input.waitId };
    },
    inputSchema: z.object({ waitId: z.string().describe('The pending wait id.') })
  });
}
```

Bindings in `kinds/index.ts` (keyed in spec order):

```ts
  'agent.wait.cancel': defineCapability({
    ...assistantToolSpecs['agent.wait.cancel'],
    create: ({ actorRunId }) => (actorRunId ? createCancelWaitTool() : null)
  }),
  'agent.wait.create': defineCapability({
    ...assistantToolSpecs['agent.wait.create'],
    create: ({ actorRunId }) => (actorRunId ? createWaitForTool() : null)
  }),
```

(Private assistant chats have no run, so they never see these tools.)

- [ ] **Step 5: Run, expect pass.** Both commands from Step 2, then `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant/engine/resume.test.ts` → PASS.

---

### Task 2.6: Wait routes

**Files:**
- Create: `packages/backend/convex/routes/agents/waits/run.ts`
- Create: `packages/backend/convex/routes/agents/waits/discussion.ts`
- Create: `packages/backend/convex/routes/agents/waits/cancel.ts`
- Modify: `packages/backend/convex/modules/assistant/runs/index.ts` (extract `assertCanControlRun` from `stopRun`)
- Create: `packages/backend/convex/modules/assistant/waits/routes.test.ts`

**Interfaces:**
- Produces: `api.routes.agents.waits.run.run({ runId }) → AgentWaitView | null`; `api.routes.agents.waits.discussion.run({ discussionId }) → AgentWaitView[]`; `api.routes.agents.waits.cancel.run({ waitId }) → null`.
- Produces: `AgentRuns.assertCanControl(ctx, run, workspace): Promise<void>` (same rule as `stopRun`).

- [ ] **Step 1: Failing tests.** `waits/routes.test.ts`:

```ts
import { mockModel } from '@convex-dev/agent';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';
import { runUntil } from '#testing/workflows';

vi.useRealTimers();
afterEach(() => vi.restoreAllMocks());

async function waitingIssueRun() {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: mockModel({
      contentSteps: [
        [{ input: JSON.stringify({ condition: { kind: 'timer' }, deadlineHours: 3 }), toolCallId: 'w', toolName: 'waitFor', type: 'tool-call' as const }],
        [{ text: 'Resumed.', type: 'text' as const }]
      ]
    }),
    modelId: 'm'
  } as never);
  const trip = await setupTrip(1);
  const issueId = await trip.owner.client.mutation(api.routes.trips.issues.create.run, { body: 'b', title: 'Wait', tripId: trip.tripId });
  const runId = (await trip.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' },
    issueId
  })) as Id<'agentRuns'>;
  await runUntil(trip.owner.test, async () => (await trip.owner.test.run((ctx) => ctx.db.get('agentRuns', runId)))?.status === 'waiting');
  return { ...trip, runId };
}

test('the run wait route shows label, deadline, and status', async () => {
  const { owner, runId } = await waitingIssueRun();
  await expect(owner.client.query(api.routes.agents.waits.run.run, { runId })).resolves.toMatchObject({
    kind: 'timer',
    label: 'a timer',
    status: 'waiting'
  });
});

test('outsiders cannot read or cancel a wait; the creator can cancel and the run resumes', async () => {
  const { owner, runId, users } = await waitingIssueRun();
  const wait = await owner.client.query(api.routes.agents.waits.run.run, { runId });
  if (!wait) throw new Error('Expected a wait');
  const outsider = await createOutsiderClient(owner.test);
  await expect(outsider.client.query(api.routes.agents.waits.run.run, { runId })).rejects.toThrow('Agent run not found');
  const member = users[0];
  if (!member) throw new Error('Expected a member');
  await expect(member.client.mutation(api.routes.agents.waits.cancel.run, { waitId: wait.id })).rejects.toThrow(
    'Only the trip creator or a group admin'
  );
  await owner.client.mutation(api.routes.agents.waits.cancel.run, { waitId: wait.id });
  await runUntil(owner.test, async () => (await owner.test.run((ctx) => ctx.db.get('agentRuns', runId)))?.status === 'complete');
});
```

- [ ] **Step 2: Run, expect fail.** `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant/waits/routes.test.ts` → FAIL.
- [ ] **Step 3: Extract control rule.** In `runs/index.ts`:

```ts
async function assertCanControl(ctx: RunWriter | RunReader, run: Doc<'agentRuns'>, workspace: Workspace): Promise<void> {
  if (run.discussionId || run.createdBy.userId === workspace.userId) return;
  const trip = run.tripId ? await loadTripContext(ctx, run.tripId, workspace).catch(() => null) : null;
  if (!trip || !isTripAdmin(trip)) throw new ConvexError('Only the trip creator or a group admin can stop this run');
}
```

`stopRun` calls it; add `static assertCanControl = assertCanControl; static requireVisible = requireOrgRun;` to the facade.

- [ ] **Step 4: Routes.**

```ts
// routes/agents/waits/run.ts
import { v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { AgentWaitValidators } from '#convex/modules/assistant/waits/schema';
import { workspaceQuery } from '#convex/modules/auth/workspace';

export const run = workspaceQuery({
  args: { runId: v.id('agentRuns') },
  returns: v.union(AgentWaitValidators.view, v.null()),
  handler: async (ctx, { runId }) => {
    const agentRun = await AgentRuns.requireVisible(ctx, runId, ctx.workspace);
    const wait = agentRun.activeWaitId ? await ctx.db.get('agentWaits', agentRun.activeWaitId) : null;
    return wait ? await AgentWaits.present(ctx, wait) : null;
  }
});
```

```ts
// routes/agents/waits/discussion.ts
import { v } from 'convex/values';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { AgentWaitValidators } from '#convex/modules/assistant/waits/schema';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';

export const run = workspaceQuery({
  args: { discussionId: v.id('discussions') },
  returns: v.array(AgentWaitValidators.view),
  handler: async (ctx, { discussionId }) => {
    await DiscussionAccess.forWorkspace(ctx, discussionId, ctx.workspace);
    return await AgentWaits.pendingForDiscussion(ctx, discussionId);
  }
});
```

```ts
// routes/agents/waits/cancel.ts
import { ConvexError, v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { workspaceMutation } from '#convex/modules/auth/workspace';

/** Resolves the wait as cancelled; the run resumes and can wrap up. */
export const run = workspaceMutation({
  args: { waitId: v.id('agentWaits') },
  returns: v.null(),
  handler: async (ctx, { waitId }) => {
    const wait = await ctx.db.get('agentWaits', waitId);
    if (!wait || wait.organizationId !== ctx.workspace.organizationId) throw new ConvexError('Wait not found');
    const agentRun = await AgentRuns.requireVisible(ctx, wait.runId, ctx.workspace);
    await AgentRuns.assertCanControl(ctx, agentRun, ctx.workspace);
    await AgentWaits.cancel(ctx, { notify: true, reason: `${ctx.workspace.viewerName} cancelled the wait`, waitId });
    return null;
  }
});
```

- [ ] **Step 5: Run, expect pass.** Same command → PASS.

---

### Task 2.7: Banner waiting state

**Files:**
- Create: `packages/ai/src/ui/runs/agent-run-wait.tsx`
- Modify: `packages/ai/src/ui/runs/agent-run-banner.tsx`
- Modify: `packages/ai/src/ui/runs/agent-run-banner.test.tsx`
- Create: `packages/ai/src/ui/runs/agent-run-wait.test.tsx`
- Modify: `packages/ai/src/backend/runs/copy.ts` (`agentRunCopy.cancelWait = 'Cancel wait'`, `waitingFor = 'Waiting for'`)
- Create: `apps/web/src/features/agents/hooks/use-agent-waits.ts` (+ `use-agent-waits.test.tsx`)
- Modify: `apps/web/src/features/issues/issue-detail/issue-agent-banner.tsx`
- Create: `apps/web/src/features/discussions/discussion-thread/discussion-wait-banner.tsx` (+ test)
- Modify: `apps/web/src/features/discussions/discussion-thread/discussion-thread-view.tsx:53-56`
- Modify: `tooling/app-actions/src/testing/ids.ts` (`agentWaitCancel: 'agent-wait-cancel'`, `discussionWaitBanner: 'discussion-wait-banner'`)

**Interfaces:**
- Produces (`#ai/ui/runs/agent-run-wait`): `export type AgentRunBannerWait = { deadlineAt: number; label: string; progress: string | null }` and `AgentRunWait({ wait, onCancel, cancelTestId })`.
- `AgentRunBanner` props gain `wait?: AgentRunBannerWait | null; onCancelWait?: () => Promise<unknown>; cancelWaitTestId?: string`.
- Produces (web): `useRunWait(runId?: Id<'agentRuns'>): AgentWaitView | null | undefined`, `useDiscussionWaits(discussionId): AgentWaitView[]`, `useCancelWait(): (waitId: Id<'agentWaits'>) => Promise<boolean>`.

- [ ] **Step 1: Failing test.** `agent-run-wait.test.tsx`:

```tsx
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { agentRunCopy } from '#ai/backend/runs/copy';
import { RUN_STATUS_LABEL } from '#ai/backend/runs/ids';
import { AgentRunBanner } from './agent-run-banner';

test('a waiting run shows what it waits for, progress, deadline, and a cancel button', async () => {
  const onCancelWait = vi.fn().mockResolvedValue(undefined);
  await render(
    <AgentRunBanner
      agentLabel="Groam"
      cancelWaitTestId="agent-wait-cancel"
      events={[]}
      onCancelWait={onCancelWait}
      run={{ headline: 'Waiting for poll “Dinner Friday”', id: 'run-1', status: 'waiting' }}
      viewAgent={<a href="/agents/groam">{agentRunCopy.viewAgent}</a>}
      wait={{ deadlineAt: Date.parse('2026-10-18T18:00:00Z'), label: 'poll “Dinner Friday”', progress: '3 of 5 voted' }}
    />
  );
  await expect.element(page.getByText(RUN_STATUS_LABEL.waiting)).toBeInTheDocument();
  await expect.element(page.getByText('Waiting for poll “Dinner Friday”')).toBeInTheDocument();
  await expect.element(page.getByText('3 of 5 voted')).toBeInTheDocument();
  await expect.element(page.getByText(/until/)).toBeInTheDocument();
  await page.getByTestId('agent-wait-cancel').click();
  expect(onCancelWait).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run, expect fail.** `cd /workspaces/groam/packages/ai && vp test run src/ui/runs/agent-run-wait.test.tsx` → FAIL.
- [ ] **Step 3: `agent-run-wait.tsx`.**

```tsx
import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { toast } from '@groam/ui/components/toast';
import { errorMessage } from '@groam/ui/lib/errors';
import { Hourglass } from 'lucide-react';
import { useState } from 'react';
import { agentRunCopy } from '#ai/backend/runs/copy';

export type AgentRunBannerWait = { deadlineAt: number; label: string; progress: string | null };

const deadlineFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** What a waiting run is waiting for, with progress, deadline, and a cancel control. */
export function AgentRunWait({
  cancelTestId,
  onCancel,
  wait
}: {
  cancelTestId?: string;
  onCancel?: () => Promise<unknown>;
  wait: AgentRunBannerWait;
}) {
  const [cancelling, setCancelling] = useState(false);
  return (
    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <Hourglass aria-hidden className="size-3.5 shrink-0 text-primary" />
      <span className="font-medium text-foreground">
        {agentRunCopy.waitingFor} {wait.label}
      </span>
      {wait.progress ? <span>{wait.progress}</span> : null}
      <span>until {deadlineFormat.format(wait.deadlineAt)}</span>
      {onCancel ? (
        <Button
          aria-busy={cancelling}
          data-testid={cancelTestId}
          disabled={cancelling}
          onClick={async () => {
            setCancelling(true);
            try {
              await onCancel();
            } catch (error: unknown) {
              toast.error(errorMessage(error, 'Unable to cancel this wait'));
            } finally {
              setCancelling(false);
            }
          }}
          size="xs"
          variant="ghost"
        >
          {cancelling ? <Spinner aria-hidden /> : null}
          {agentRunCopy.cancelWait}
        </Button>
      ) : null}
    </div>
  );
}
```

`agent-run-banner.tsx`: add the three props; under the activity line render `{run.status === 'waiting' && wait ? <AgentRunWait cancelTestId={cancelWaitTestId} onCancel={onCancelWait} wait={wait} /> : null}`; `statusTextClass` returns `'text-primary'` for `waiting` too; the leading icon shows `<Hourglass className="size-3.5" />` when `run.status === 'waiting'` instead of `PulsingDot`. Export path stays `@groam/ai/ui/runs/agent-run-banner`; add `./ui/runs/agent-run-wait` to `packages/ai/package.json` exports only if the package lists UI files individually (check `exports` and mirror the banner's entry).

- [ ] **Step 4: Web hooks and wiring.** `features/agents/hooks/use-agent-waits.ts`:

```ts
import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation, useQuery } from 'convex/react';
import { useCallback } from 'react';
import { errorMessage } from '@/lib/errors';

export function useRunWait(runId: Id<'agentRuns'> | undefined) {
  return useQuery(api.routes.agents.waits.run.run, runId ? { runId } : 'skip');
}

export function useDiscussionWaits(discussionId: Id<'discussions'>) {
  return useQuery(api.routes.agents.waits.discussion.run, { discussionId }) ?? [];
}

export function useCancelWait() {
  const cancel = useMutation(api.routes.agents.waits.cancel.run);
  return useCallback(
    async (waitId: Id<'agentWaits'>) => {
      try {
        await cancel({ waitId });
        return true;
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to cancel this wait'));
        return false;
      }
    },
    [cancel]
  );
}
```

`issue-agent-banner.tsx`: `const wait = useRunWait(run?.status === 'waiting' ? run.id : undefined); const cancelWait = useCancelWait();` and pass `wait={wait ?? null} onCancelWait={wait ? () => cancelWait(wait.id) : undefined} cancelWaitTestId={testIds.agentWaitCancel}`.

`discussion-wait-banner.tsx`:

```tsx
import { assistantAgents } from '@groam/ai/agents';
import { agentRunCopy } from '@groam/ai/backend/runs/copy';
import { AgentRunBanner } from '@groam/ai/ui/runs/agent-run-banner';
import type { Id } from '@groam/backend/data-model';
import { useCancelWait, useDiscussionWaits } from '@/features/agents/hooks/use-agent-waits';
import { agentRunHref } from '@/features/agents/agent-run/agent-run-href';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

/** Runs in this chat that are waiting on the group; new messages are answered normally meanwhile. */
export function DiscussionWaitBanner({ discussionId }: { discussionId: Id<'discussions'> }) {
  const waits = useDiscussionWaits(discussionId);
  const cancelWait = useCancelWait();
  if (waits.length === 0) return null;
  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-border/70 p-3" data-testid={testIds.discussionWaitBanner}>
      {waits.map((wait) => (
        <AgentRunBanner
          agentLabel={assistantAgents.groam.label}
          cancelWaitTestId={testIds.agentWaitCancel}
          events={[]}
          key={wait.id}
          onCancelWait={() => cancelWait(wait.id)}
          run={{ headline: `${agentRunCopy.waitingFor} ${wait.label}`, id: wait.runId, status: 'waiting' }}
          viewAgent={<Link {...agentRunHref(assistantAgents.groam.id, wait.runId)}>{agentRunCopy.viewAgent}</Link>}
          wait={wait}
        />
      ))}
    </div>
  );
}
```

`discussion-thread-view.tsx`: render `<DiscussionWaitBanner discussionId={discussionId} />` between header and body. View test `discussion-wait-banner.test.tsx` mocks `@/features/agents/hooks/use-agent-waits` (returns one wait, then none) and asserts the banner text, the cancel call, and nothing rendered for `[]`.

- [ ] **Step 5: Run, expect pass.**

```bash
cd /workspaces/groam/packages/ai && vp test run src/ui/runs
cd /workspaces/groam/apps/web && vp test run --project views src/features/discussions/discussion-thread src/features/issues/issue-detail src/features/agents/hooks
```

Expected: PASS.

---

### Chunk 2 verification

- [ ] Run:

```bash
cd /workspaces/groam && just codegen
cd /workspaces/groam/packages/ai && vp run typecheck && vp test run
cd /workspaces/groam/packages/backend && vp run typecheck && vp test run
cd /workspaces/groam/apps/web && vp run typecheck && vp test run --project unit --project views
cd /workspaces/groam && vp run lint && vp check
```

- [ ] Acceptance evidence:
  - `resume.test.ts`: suspend/resume journal is `turn, event, turn`; reconnect failure records `Reconnect ChatGPT to continue`; stopping a waiting run cancels its wait (no resume).
  - `waits.test.ts`: deadline bounds, one active wait, idempotent expiry, cancel, undeliverable event keeps the wait resolved, tool entry refuses non-run callers.
  - `routes.test.ts`: outsider denied, non-admin member denied cancel, creator cancel resumes the run.
  - `workflow.ts` hash unchanged (`workflow.test.ts` passes without editing the constant).
  - Nothing scans `agentWaits` without the `by_kind_and_refId_and_status` or `by_runId` index (`rg -n "query\('agentWaits'\)" packages/backend/convex` — each followed by `withIndex`).

---

## Chunk 3: Polls module, routes, UI, `createPoll`, `poll` condition

### Task 3.1: Poll schema, eligibility, tallies

**Files:**
- Create: `packages/backend/convex/modules/polls/schema.ts`
- Create: `packages/backend/convex/modules/polls/tally.ts`
- Create: `packages/backend/convex/modules/polls/tally.test.ts`
- Create: `packages/backend/convex/modules/polls/eligibility.ts`
- Modify: `packages/backend/convex/schema.ts` (spread `pollTables`)
- Create: `packages/backend/convex/modules/travel/travelers/statuses.ts` (leaf module: imports only `auth/workspace` and generated types, so waits conditions can use it without an import cycle through `issues/sync`)
- Modify: `packages/backend/convex/modules/travel/travelers/index.ts` (re-export `statusesForTrip` on the facade)
- Modify: `packages/backend/convex/modules/README.md` (add `modules/polls/` to the shape list)

**Interfaces:**
- Produces (`polls/schema.ts`): `pollTables`, `PollValidators.{createInput, creator, option, rule, status, view}`, `POLL_LIMITS`, types `PollRule`, `PollView`, `PollCreator`, `PollCreateInput`.
- Produces (`polls/tally.ts`, pure): `type PollVoter = { name: string; userId: string }`, `type PollTally = { eligibleCount: number; tallies: Array<{ count: number; id: string; label: string }>; voted: PollVoter[]; votedCount: number }`, `tallyPoll(options, votes, eligible): PollTally`, `ruleMet(rule, tally, closed): boolean`, `ruleLabel(rule): string`, `pollSummary(question, tally, label): string`, `pollProgress(tally): string`.
- Produces (`polls/eligibility.ts`): `eligibleVoters(ctx, poll): Promise<PollVoter[]>`, `pollTally(ctx, poll): Promise<PollTally>`.
- Produces (`travel/travelers/statuses.ts`): `statusesForTrip(ctx, tripId, organizationId): Promise<Array<{ name: string; status: 'going' | 'maybe' | 'not_going'; userId: string }>>`, also exposed as `TripTravelers.statusesForTrip`.

- [ ] **Step 1: Failing unit test.** `polls/tally.test.ts`:

```ts
import { expect, test } from 'vite-plus/test';
import { pollSummary, ruleLabel, ruleMet, tallyPoll } from '#convex/modules/polls/tally';

const options = [
  { id: 'o1', label: 'Sushi' },
  { id: 'o2', label: 'Tapas' }
];
const people = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ name: `P${index + 1}`, userId: `u${index + 1}` }));

test('zero eligible voters never meet allVoted, percent quorum, or majority', () => {
  const tally = tallyPoll(options, [], []);
  expect(ruleMet({ kind: 'allVoted' }, tally, false)).toBe(false);
  expect(ruleMet({ kind: 'quorum', percent: 50 }, tally, false)).toBe(false);
  expect(ruleMet({ kind: 'optionVotes', majority: true }, tally, false)).toBe(false);
});

test('votes from people who are no longer eligible do not count', () => {
  const tally = tallyPoll(options, [{ optionIds: ['o1'], userId: 'gone' }, { optionIds: ['o1'], userId: 'u1' }], people(2));
  expect(tally.votedCount).toBe(1);
  expect(tally.tallies).toEqual([
    { count: 1, id: 'o1', label: 'Sushi' },
    { count: 0, id: 'o2', label: 'Tapas' }
  ]);
});

test('multi-select majority counts each option against all eligible voters', () => {
  const tally = tallyPoll(
    options,
    [
      { optionIds: ['o1', 'o2'], userId: 'u1' },
      { optionIds: ['o1'], userId: 'u2' },
      { optionIds: ['o2'], userId: 'u3' }
    ],
    people(4)
  );
  expect(ruleMet({ kind: 'optionVotes', majority: true }, tally, false)).toBe(false);
  const more = tallyPoll(options, [...[{ optionIds: ['o1'], userId: 'u4' }], { optionIds: ['o1', 'o2'], userId: 'u1' }, { optionIds: ['o1'], userId: 'u2' }], people(4));
  expect(ruleMet({ kind: 'optionVotes', majority: true }, more, false)).toBe(true);
});

test('quorum, min, and closed rules', () => {
  const tally = tallyPoll(options, [{ optionIds: ['o1'], userId: 'u1' }, { optionIds: ['o1'], userId: 'u2' }], people(5));
  expect(ruleMet({ count: 2, kind: 'quorum' }, tally, false)).toBe(true);
  expect(ruleMet({ kind: 'quorum', percent: 50 }, tally, false)).toBe(false);
  expect(ruleMet({ kind: 'optionVotes', min: 2 }, tally, false)).toBe(true);
  expect(ruleMet({ kind: 'closed' }, tally, false)).toBe(false);
  expect(ruleMet({ kind: 'closed' }, tally, true)).toBe(true);
});

test('summary reads like the spec example', () => {
  const tally = tallyPoll(
    options,
    [
      ...['u1', 'u2', 'u3', 'u4'].map((userId) => ({ optionIds: ['o1'], userId })),
      { optionIds: ['o2'], userId: 'u5' }
    ],
    people(6)
  );
  expect(pollSummary('Dinner Friday', tally, ruleLabel({ kind: 'optionVotes', majority: true }))).toBe(
    "majority for 'Dinner Friday' — Sushi 4, Tapas 1; 5 of 6 voted"
  );
});
```

- [ ] **Step 2: Run, expect fail.** `cd /workspaces/groam/packages/backend && vp test run convex/modules/polls/tally.test.ts` → FAIL.
- [ ] **Step 3: `polls/schema.ts`.**

```ts
import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';
import { assistantAgentValidator } from '#convex/modules/assistant/validators/index';

export const POLL_LIMITS = {
  maxOpenDays: 14,
  maxOptions: 10,
  minOptions: 2,
  optionLength: 80,
  questionLength: 200
} as const;

const option = v.object({ id: v.string(), label: v.string() });

const creator = v.union(
  v.object({ kind: v.literal('user'), name: v.string(), userId: v.string() }),
  v.object({
    agentId: assistantAgentValidator,
    kind: v.literal('agent'),
    name: v.string(),
    runId: v.id('agentRuns')
  })
);

const status = v.union(v.literal('open'), v.literal('closed'));

const rule = v.union(
  v.object({ kind: v.literal('allVoted') }),
  v.object({ count: v.number(), kind: v.literal('quorum') }),
  v.object({ kind: v.literal('quorum'), percent: v.number() }),
  v.object({ kind: v.literal('optionVotes'), min: v.number() }),
  v.object({ kind: v.literal('optionVotes'), majority: v.literal(true) }),
  v.object({ kind: v.literal('closed') })
);

const createInput = {
  closesAt: v.optional(v.number()),
  discussionId: v.optional(v.id('discussions')),
  multiSelect: v.boolean(),
  options: v.array(v.string()),
  question: v.string(),
  tripId: v.optional(v.id('trips'))
};

const voter = v.object({ name: v.string(), userId: v.string() });

const view = v.object({
  canClose: v.boolean(),
  canVote: v.boolean(),
  closedAt: v.union(v.number(), v.null()),
  closesAt: v.union(v.number(), v.null()),
  createdAt: v.number(),
  createdBy: v.object({ kind: v.union(v.literal('user'), v.literal('agent')), name: v.string() }),
  discussionId: v.union(v.id('discussions'), v.null()),
  eligibleCount: v.number(),
  id: v.id('polls'),
  multiSelect: v.boolean(),
  myOptionIds: v.array(v.string()),
  question: v.string(),
  status,
  tallies: v.array(v.object({ count: v.number(), id: v.string(), label: v.string() })),
  tripId: v.union(v.id('trips'), v.null()),
  votedCount: v.number(),
  voters: v.array(voter)
});

export const PollValidators = { createInput, creator, option, rule, status, view, voter };

export type PollRule = Infer<typeof rule>;
export type PollView = Infer<typeof view>;
export type PollCreator = Infer<typeof creator>;
export type PollCreateInput = {
  closesAt?: number;
  discussionId?: Infer<typeof createInput.discussionId>;
  multiSelect: boolean;
  options: string[];
  question: string;
  tripId?: Infer<typeof createInput.tripId>;
};

export const pollTables = {
  pollVotes: defineTable({
    name: v.string(),
    optionIds: v.array(v.string()),
    organizationId: v.string(),
    pollId: v.id('polls'),
    updatedAt: v.number(),
    userId: v.string()
  }).index('by_pollId_and_userId', ['pollId', 'userId']),
  polls: defineTable({
    closedAt: v.optional(v.number()),
    closesAt: v.optional(v.number()),
    createdBy: creator,
    discussionId: v.optional(v.id('discussions')),
    multiSelect: v.boolean(),
    options: v.array(option),
    organizationId: v.string(),
    question: v.string(),
    status,
    tripId: v.optional(v.id('trips')),
    updatedAt: v.number()
  })
    .index('by_tripId_and_status', ['tripId', 'status'])
    .index('by_organizationId_and_status', ['organizationId', 'status'])
    .index('by_discussionId', ['discussionId'])
};
```

- [ ] **Step 4: `polls/tally.ts`.**

```ts
import type { PollRule } from '#convex/modules/polls/schema';

export type PollVoter = { name: string; userId: string };
export type PollTally = {
  eligibleCount: number;
  tallies: Array<{ count: number; id: string; label: string }>;
  voted: PollVoter[];
  votedCount: number;
};

/** Counts only current eligible voters; group sizes are tens, so this runs on every read. */
export function tallyPoll(
  options: ReadonlyArray<{ id: string; label: string }>,
  votes: ReadonlyArray<{ optionIds: readonly string[]; userId: string }>,
  eligible: readonly PollVoter[]
): PollTally {
  const byId = new Map(eligible.map((voter) => [voter.userId, voter]));
  const counted = votes.filter((vote) => byId.has(vote.userId) && vote.optionIds.length > 0);
  return {
    eligibleCount: eligible.length,
    tallies: options.map((option) => ({
      count: counted.filter((vote) => vote.optionIds.includes(option.id)).length,
      id: option.id,
      label: option.label
    })),
    voted: counted.flatMap((vote) => {
      const voter = byId.get(vote.userId);
      return voter ? [voter] : [];
    }),
    votedCount: counted.length
  };
}

export function ruleMet(rule: PollRule, tally: PollTally, closed: boolean): boolean {
  const top = Math.max(0, ...tally.tallies.map((entry) => entry.count));
  switch (rule.kind) {
    case 'allVoted':
      return tally.eligibleCount > 0 && tally.votedCount >= tally.eligibleCount;
    case 'quorum':
      return 'count' in rule
        ? tally.votedCount >= rule.count
        : tally.eligibleCount > 0 && tally.votedCount * 100 >= rule.percent * tally.eligibleCount;
    case 'optionVotes':
      return 'min' in rule ? top >= rule.min : tally.eligibleCount > 0 && top * 2 > tally.eligibleCount;
    case 'closed':
      return closed;
  }
}

export function ruleLabel(rule: PollRule): string {
  switch (rule.kind) {
    case 'allVoted':
      return 'everyone voted';
    case 'quorum':
      return 'count' in rule ? `${rule.count} votes` : `${rule.percent}% voted`;
    case 'optionVotes':
      return 'min' in rule ? `an option reached ${rule.min} votes` : 'majority';
    case 'closed':
      return 'poll closed';
  }
}

export function pollProgress(tally: PollTally): string {
  return `${tally.votedCount} of ${tally.eligibleCount} voted`;
}

export function pollSummary(question: string, tally: PollTally, label: string): string {
  const counts = [...tally.tallies]
    .sort((left, right) => right.count - left.count)
    .map((entry) => `${entry.label} ${entry.count}`)
    .join(', ');
  return `${label} for '${question}' — ${counts}; ${pollProgress(tally)}`;
}
```

- [ ] **Step 5: `travel/travelers/statuses.ts` session-free statuses.** Move `travelersForTrip` and `rsvpStatus` from `travelers/index.ts` into this leaf file (export both; `index.ts` imports them back), then add:

```ts
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { systemRoster } from '#convex/modules/auth/workspace';

/** RSVP per current member, without a session (scheduled code, waits, polls). */
export async function statusesForTrip(
  ctx: MutationCtx | QueryCtx,
  tripId: Id<'trips'>,
  organizationId: string
) {
  const roster = await systemRoster(ctx, organizationId);
  const rows = await travelersForTrip(ctx, tripId, roster.members.map((member) => member.userId));
  const byUserId = new Map(rows.flatMap((row) => (row.userId ? [[row.userId, row] as const] : [])));
  return roster.members.map((member) => ({
    name: member.name,
    status: rsvpStatus(byUserId.get(member.userId)?.status),
    userId: member.userId
  }));
}
```

In `travelers/index.ts` add `static statusesForTrip = statusesForTrip;` to `TripTravelers`.

- [ ] **Step 6: `polls/eligibility.ts`.**

```ts
import type { Doc } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { systemRoster } from '#convex/modules/auth/workspace';
import { kindPolicy } from '#convex/modules/discussions/kinds/index';
import { type PollTally, type PollVoter, tallyPoll } from '#convex/modules/polls/tally';
import { statusesForTrip } from '#convex/modules/travel/travelers/statuses';

type PollScope = Pick<Doc<'polls'>, 'discussionId' | 'organizationId' | 'tripId'>;
const MAX_VOTES = 200;

/** Trip polls: listed travelers not marked not going. Workspace polls: members. Chats narrow both. */
export async function eligibleVoters(ctx: QueryCtx | MutationCtx, poll: PollScope): Promise<PollVoter[]> {
  const voters = poll.tripId
    ? (await statusesForTrip(ctx, poll.tripId, poll.organizationId))
        .filter((traveler) => traveler.status !== 'not_going')
        .map(({ name, userId }) => ({ name, userId }))
    : (await systemRoster(ctx, poll.organizationId)).members.map(({ name, userId }) => ({ name, userId }));
  if (!poll.discussionId) return voters;
  const discussion = await ctx.db.get('discussions', poll.discussionId);
  if (!discussion || kindPolicy(discussion.kind).audience !== 'members') return voters;
  const memberships = await Promise.all(
    voters.map((voter) =>
      ctx.db
        .query('discussionMembers')
        .withIndex('by_discussionId_and_userId', (query) =>
          query.eq('discussionId', discussion._id).eq('userId', voter.userId)
        )
        .unique()
    )
  );
  return voters.filter((_, index) => memberships[index] !== null);
}

export async function pollVotes(ctx: QueryCtx | MutationCtx, poll: Doc<'polls'>) {
  return await ctx.db
    .query('pollVotes')
    .withIndex('by_pollId_and_userId', (query) => query.eq('pollId', poll._id))
    .take(MAX_VOTES);
}

export async function pollTally(ctx: QueryCtx | MutationCtx, poll: Doc<'polls'>): Promise<PollTally> {
  const [eligible, votes] = await Promise.all([eligibleVoters(ctx, poll), pollVotes(ctx, poll)]);
  return tallyPoll(poll.options, votes, eligible);
}
```

- [ ] **Step 7: Schema spread, codegen, run.** Spread `...pollTables` in `convex/schema.ts`; `cd /workspaces/groam && just codegen && cd packages/backend && vp test run convex/modules/polls/tally.test.ts` → PASS.

---

### Task 3.2: The `poll` wait condition

**Files:**
- Create: `packages/backend/convex/modules/assistant/waits/conditions/poll.ts`
- Modify: `packages/backend/convex/modules/assistant/waits/conditions/index.ts` (register `poll`)
- Modify: `packages/backend/convex/modules/assistant/waits/schema.ts` (condition, kind, snapshot variants)

**Interfaces:**
- Produces condition `{ kind: 'poll'; pollId: Id<'polls'>; rule: PollRule[] }`, snapshot `{ closed: boolean; eligible: number; kind: 'poll'; pollId: Id<'polls'>; question: string; tallies: Array<{ count: number; label: string }>; voters: string[] }`.

- [ ] **Step 1: Schema variants.** In `waits/schema.ts`:

```ts
import { PollValidators } from '#convex/modules/polls/schema';

const pollCondition = v.object({ kind: v.literal('poll'), pollId: v.id('polls'), rule: v.array(PollValidators.rule) });
const condition = v.union(timerCondition, pollCondition);
const kind = v.union(v.literal('timer'), v.literal('poll'));
const pollSnapshot = v.object({
  closed: v.boolean(),
  eligible: v.number(),
  kind: v.literal('poll'),
  pollId: v.id('polls'),
  question: v.string(),
  tallies: v.array(v.object({ count: v.number(), label: v.string() })),
  voters: v.array(v.string())
});
const snapshot = v.union(timerSnapshot, pollSnapshot);
```

- [ ] **Step 2: `conditions/poll.ts`.**

```ts
import { ConvexError } from 'convex/values';
import { defineWaitCondition } from '#convex/modules/assistant/waits/conditions/types';
import { pollTally } from '#convex/modules/polls/eligibility';
import type { PollRule } from '#convex/modules/polls/schema';
import { pollProgress, pollSummary, ruleLabel, ruleMet } from '#convex/modules/polls/tally';

function assertRule(rule: PollRule[]): void {
  if (rule.length === 0) throw new ConvexError('Choose at least one poll rule');
  for (const entry of rule) {
    if (entry.kind === 'quorum' && 'count' in entry && !(Number.isInteger(entry.count) && entry.count >= 1)) {
      throw new ConvexError('A quorum count must be a whole number of at least 1');
    }
    if (entry.kind === 'quorum' && 'percent' in entry && !(entry.percent >= 1 && entry.percent <= 100)) {
      throw new ConvexError('A quorum percent must be between 1 and 100');
    }
    if (entry.kind === 'optionVotes' && 'min' in entry && !(Number.isInteger(entry.min) && entry.min >= 1)) {
      throw new ConvexError('An option vote minimum must be a whole number of at least 1');
    }
  }
}

export const pollCondition = defineWaitCondition({
  evaluate: async (ctx, condition) => {
    const poll = await ctx.db.get('polls', condition.pollId);
    if (!poll) {
      return {
        met: false,
        progress: null,
        snapshot: { closed: true, eligible: 0, kind: 'poll', pollId: condition.pollId, question: 'Deleted poll', tallies: [], voters: [] },
        summary: 'The poll was deleted'
      };
    }
    const tally = await pollTally(ctx, poll);
    const closed = poll.status === 'closed';
    const metRule = condition.rule.find((rule) => ruleMet(rule, tally, closed));
    const label = ruleLabel(metRule ?? condition.rule[0] ?? { kind: 'allVoted' });
    return {
      met: metRule !== undefined,
      progress: pollProgress(tally),
      snapshot: {
        closed,
        eligible: tally.eligibleCount,
        kind: 'poll',
        pollId: poll._id,
        question: poll.question,
        tallies: tally.tallies.map(({ count, label: optionLabel }) => ({ count, label: optionLabel })),
        voters: tally.voted.map((voter) => voter.name)
      },
      summary: pollSummary(poll.question, tally, label)
    };
  },
  kind: 'poll',
  label: async (ctx, condition) => {
    const poll = await ctx.db.get('polls', condition.pollId);
    return poll ? `poll “${poll.question}”` : 'a deleted poll';
  },
  refId: (condition) => condition.pollId,
  validate: async (ctx, condition, scope) => {
    assertRule(condition.rule);
    const poll = await ctx.db.get('polls', condition.pollId);
    if (!poll || poll.organizationId !== scope.organizationId) throw new ConvexError('Poll not found');
    if (scope.discussionId && poll.discussionId && poll.discussionId !== scope.discussionId) {
      throw new ConvexError('That poll belongs to another chat');
    }
    if (scope.tripId && poll.tripId && poll.tripId !== scope.tripId) {
      throw new ConvexError('That poll belongs to another trip');
    }
    return { tripId: poll.tripId ?? scope.tripId };
  }
});
```

Register in `conditions/index.ts`: `poll: pollCondition`.

- [ ] **Step 3: Codegen + typecheck.** `cd /workspaces/groam && just codegen && cd packages/backend && vp run typecheck` → PASS. Behavior is tested through routes in Task 3.3.

---

### Task 3.3: Poll writes, reads, routes, and `signal`

**Files:**
- Create: `packages/backend/convex/modules/polls/access.ts`
- Create: `packages/backend/convex/modules/polls/writes.ts`
- Create: `packages/backend/convex/modules/polls/reads.ts`
- Create: `packages/backend/convex/modules/polls/index.ts`
- Create: `packages/backend/convex/modules/polls/functions.ts`
- Create: `packages/backend/convex/routes/polls/{create,vote,retract,close,get}.ts`
- Create: `packages/backend/convex/routes/polls/list/{trip,workspace,discussion}.ts`
- Create: `packages/backend/convex/modules/polls/polls.test.ts`
- Create: `packages/backend/convex/modules/polls/poll-waits.test.ts`
- Create: `packages/backend/testing/polls.ts`

**Interfaces:**
- Produces `Polls` facade: `create(ctx, workspace, input: PollCreateInput, creator: PollCreator): Promise<Id<'polls'>>`, `vote(ctx, workspace, pollId, optionIds: string[]): Promise<null>`, `retract(ctx, workspace, pollId): Promise<null>`, `close(ctx, workspace, pollId): Promise<null>`, `closeScheduled(ctx, pollId): Promise<null>`, `get(ctx, workspace, pollId): Promise<PollView>`, `listForTrip(ctx, workspace, tripId)`, `listForWorkspace(ctx, workspace)`, `listForDiscussion(ctx, workspace, discussionId)` (all `Promise<PollView[]>`).
- Produces routes: `api.routes.polls.create.run(PollCreateInput) → Id<'polls'>`, `vote.run({ pollId, optionIds }) → null`, `retract.run({ pollId }) → null`, `close.run({ pollId }) → null`, `get.run({ pollId }) → PollView`, `list.trip.run({ tripId })`, `list.workspace.run({})`, `list.discussion.run({ discussionId })` → `PollView[]`.
- Produces `internal.modules.polls.functions.closeScheduled({ pollId })`.
- Produces `#testing/polls`: `createTripPoll(owner, tripId, overrides?)`, `pollWaitRun(trip, pollId, rule, deadlineAt?)` (starts an idle workflow run and creates a poll wait through `AgentWaits.create`).

- [ ] **Step 1: Failing tests.** `polls/polls.test.ts`:

```ts
import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { createTripPoll } from '#testing/polls';
import { setupGroup, setupTrip } from '#testing/trips';

test('travelers vote, change, and retract; tallies follow', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a member');
  const pollId = await createTripPoll(owner, tripId);
  await owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  await member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o2'], pollId });
  await member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  await expect(owner.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    eligibleCount: 2,
    myOptionIds: ['o1'],
    tallies: [{ count: 2, label: 'Sushi' }, { count: 0, label: 'Tapas' }],
    votedCount: 2
  });
  await member.client.mutation(api.routes.polls.retract.run, { pollId });
  await expect(member.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    myOptionIds: [],
    votedCount: 1
  });
});

test('single-select polls take exactly one known option', async () => {
  const { owner, tripId } = await setupTrip(0);
  const pollId = await createTripPoll(owner, tripId);
  await expect(owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1', 'o2'], pollId })).rejects.toThrow('Pick one option');
  await expect(owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['nope'], pollId })).rejects.toThrow('Unknown option');
});

test('creating a poll validates question, option count, and close time', async () => {
  const { owner, tripId } = await setupTrip(0);
  const base = { multiSelect: false, options: ['A', 'B'], question: 'Where?', tripId };
  await expect(owner.client.mutation(api.routes.polls.create.run, { ...base, options: ['Only'] })).rejects.toThrow('2 to 10 options');
  await expect(owner.client.mutation(api.routes.polls.create.run, { ...base, options: ['A', 'a'] })).rejects.toThrow('Options must be different');
  await expect(owner.client.mutation(api.routes.polls.create.run, { ...base, question: '  ' })).rejects.toThrow('question');
  await expect(owner.client.mutation(api.routes.polls.create.run, { ...base, closesAt: Date.now() - 1 })).rejects.toThrow('close in the future');
});

test('outsiders cannot read or vote; non-creators cannot close; admins can', async () => {
  const group = await setupGroup();
  const member = await group.addUser('Member');
  const admin = await group.addUser('Admin', 'admin');
  const pollId = await group.owner.client.mutation(api.routes.polls.create.run, {
    multiSelect: false,
    options: ['Beach', 'Mountains'],
    question: 'Next trip?'
  });
  const outsider = await createOutsiderClient(group.owner.test);
  await expect(outsider.client.query(api.routes.polls.get.run, { pollId })).rejects.toThrow('Poll not found');
  await expect(outsider.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId })).rejects.toThrow('Poll not found');
  await expect(member.client.mutation(api.routes.polls.close.run, { pollId })).rejects.toThrow('Only the poll creator or a group admin');
  await admin.client.mutation(api.routes.polls.close.run, { pollId });
  await expect(member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId })).rejects.toThrow('This poll is closed');
  await expect(group.owner.client.query(api.routes.polls.list.workspace.run, {})).resolves.toHaveLength(1);
});

test('a traveler marked not going is not eligible on a trip poll', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a member');
  await member.client.mutation(api.routes.trips.travelers.set.run, { status: 'not_going', tripId });
  const pollId = await createTripPoll(owner, tripId);
  await expect(member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId })).rejects.toThrow('You cannot vote on this poll');
  await expect(owner.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({ eligibleCount: 1 });
});

test('a poll with closesAt closes itself', async () => {
  const { owner, tripId } = await setupTrip(0);
  const pollId = await createTripPoll(owner, tripId, { closesAt: Date.now() + 60 * 60 * 1000 });
  await owner.test.mutation(internal.modules.polls.functions.closeScheduled, { pollId });
  await expect(owner.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({ status: 'closed' });
});
```

(Add `internal` to the `#convex-generated/api` import.)

`polls/poll-waits.test.ts` (Review Focus 2, 4, 5):

```ts
import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { createTripPoll, pollWaitRun } from '#testing/polls';
import { setupTrip } from '#testing/trips';

test('a vote that meets the rule resolves only that poll’s wait', async () => {
  const trip = await setupTrip(1);
  const [member] = trip.users;
  if (!member) throw new Error('Expected a member');
  const watched = await createTripPoll(trip.owner, trip.tripId);
  const other = await createTripPoll(trip.owner, trip.tripId, { question: 'Other?' });
  const a = await pollWaitRun(trip, watched, [{ kind: 'allVoted' }]);
  const b = await pollWaitRun(trip, other, [{ kind: 'allVoted' }]);
  await trip.owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId: watched });
  expect((await a.wait())?.status).toBe('waiting');
  await member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o2'], pollId: watched });
  expect(await a.wait()).toMatchObject({
    outcome: { reason: 'met', summary: "everyone voted for 'Where should we eat?' — Sushi 1, Tapas 1; 2 of 2 voted" },
    status: 'met'
  });
  expect((await b.wait())?.status).toBe('waiting');
});

test('a retracted vote un-meets a quorum that was not yet resolved', async () => {
  const trip = await setupTrip(2);
  const [first] = trip.users;
  if (!first) throw new Error('Expected members');
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  const run = await pollWaitRun(trip, pollId, [{ count: 3, kind: 'quorum' }]);
  await trip.owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  await first.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  await first.client.mutation(api.routes.polls.retract.run, { pollId });
  expect(await run.wait()).toMatchObject({ status: 'waiting' });
});

test('two votes that both meet the rule resolve the wait once', async () => {
  const trip = await setupTrip(2);
  const [first, second] = trip.users;
  if (!first || !second) throw new Error('Expected members');
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  const run = await pollWaitRun(trip, pollId, [{ count: 1, kind: 'quorum' }]);
  await Promise.all([
    first.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId }),
    second.client.mutation(api.routes.polls.vote.run, { optionIds: ['o2'], pollId })
  ]);
  const wait = await run.wait();
  expect(wait?.status).toBe('met');
  const resolvedAt = wait?.resolvedAt;
  await trip.owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o2'], pollId });
  expect((await run.wait())?.resolvedAt).toBe(resolvedAt);
  const events = await trip.owner.test.run(async (ctx) =>
    (await ctx.db.query('agentWaits').withIndex('by_runId', (query) => query.eq('runId', run.runId)).collect()).length
  );
  expect(events).toBe(1);
});

test('invited travelers without an account are neither eligible nor counted', async () => {
  const trip = await setupTrip(1);
  const [member] = trip.users;
  if (!member) throw new Error('Expected a member');
  await trip.owner.test.run((ctx) =>
    ctx.db.insert('tripTravelers', {
      email: 'friend@example.com',
      invitationId: 'invite-1',
      name: 'Friend',
      organizationId: trip.owner.organizationId as string,
      status: 'invited',
      tripId: trip.tripId,
      updatedAt: Date.now()
    })
  );
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  const run = await pollWaitRun(trip, pollId, [{ kind: 'allVoted' }]);
  await expect(trip.owner.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({ eligibleCount: 2 });
  await trip.owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  await member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  expect((await run.wait())?.status).toBe('met');
});

test('a deadline after the rule was met is a no-op', async () => {
  const trip = await setupTrip(0);
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  const run = await pollWaitRun(trip, pollId, [{ kind: 'allVoted' }]);
  await trip.owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  const met = await run.wait();
  await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, { waitId: run.waitId });
  expect(await run.wait()).toMatchObject({ outcome: { reason: 'met' }, resolvedAt: met?.resolvedAt, status: 'met' });
});

test('closing the poll meets a closed rule and zero-eligible polls never meet allVoted', async () => {
  const trip = await setupTrip(0);
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  const run = await pollWaitRun(trip, pollId, [{ kind: 'closed' }]);
  await trip.owner.client.mutation(api.routes.polls.close.run, { pollId });
  expect((await run.wait())?.outcome?.reason).toBe('met');
  await trip.owner.client.mutation(api.routes.trips.travelers.set.run, { status: 'not_going', tripId: trip.tripId });
  const empty = await createTripPoll(trip.owner, trip.tripId, { question: 'Nobody?' });
  const zero = await pollWaitRun(trip, empty, [{ kind: 'allVoted' }]);
  expect((await zero.wait())?.status).toBe('waiting');
});
```

- [ ] **Step 2: Test helpers** `packages/backend/testing/polls.ts`:

```ts
import { start } from '@convex-dev/workflow';
import { makeFunctionReference } from 'convex/server';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import type { PollRule } from '#convex/modules/polls/schema';
import type { createAuthenticatedTest } from '#testing/factory';
import type { setupTrip } from '#testing/trips';

type Owner = Awaited<ReturnType<typeof createAuthenticatedTest>>;
const HOUR = 60 * 60 * 1000;
// Defined in `modules/assistant/waits/waits.test.ts`; sleeps for a day so events have a target.
const idleWorkflow = makeFunctionReference<'mutation'>('modules/assistant/waits/waits.test:idle');

export async function createTripPoll(
  owner: Owner,
  tripId: Id<'trips'>,
  overrides: Partial<{ closesAt: number; multiSelect: boolean; options: string[]; question: string }> = {}
) {
  return await owner.client.mutation(api.routes.polls.create.run, {
    multiSelect: false,
    options: ['Sushi', 'Tapas'],
    question: 'Where should we eat?',
    tripId,
    ...overrides
  });
}

export async function pollWaitRun(
  trip: Awaited<ReturnType<typeof setupTrip>>,
  pollId: Id<'polls'>,
  rule: PollRule[],
  deadlineAt = Date.now() + 24 * HOUR
) {
  const { runId, waitId } = await trip.owner.test.run(async (ctx) => {
    const runId = await ctx.db.insert('agentRuns', {
      actorTokenIdentifier: 'issuer|owner',
      agentId: 'groam',
      createdBy: { name: 'Owner', userId: trip.owner.userId },
      kickoff: 'assign',
      organizationId: trip.owner.organizationId as string,
      shortId: `poll${Math.random().toString(36).slice(2, 6)}`,
      status: 'running',
      surface: 'chat',
      title: 'Poll wait',
      tripId: trip.tripId,
      updatedAt: Date.now()
    });
    const workflowId = await start(ctx, idleWorkflow as never, {});
    await ctx.db.patch('agentRuns', runId, { workflowId });
    const created = await AgentWaits.create(ctx, { condition: { kind: 'poll', pollId, rule }, deadlineAt, runId });
    return { runId, waitId: created.waitId };
  });
  return { runId, wait: () => trip.owner.test.run((ctx) => ctx.db.get('agentWaits', waitId)), waitId };
}
```

(Using a test-file workflow from a shared helper relies on `waits.test.ts` being part of `appModules` — it is, via `import.meta.glob('../convex/**/*.ts')`.)

- [ ] **Step 3: Run, expect fail.** `cd /workspaces/groam/packages/backend && vp test run convex/modules/polls` → FAIL (`api.routes.polls` missing).
- [ ] **Step 4: `polls/access.ts`.**

```ts
import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { isOrganizationManager, type Workspace } from '#convex/modules/auth/workspace';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import { eligibleVoters } from '#convex/modules/polls/eligibility';
import { findVisibleTrip } from '#convex/modules/travel/trips/ctx';

type Ctx = QueryCtx | MutationCtx;

/** A poll outside the group, on a hidden trip, or in a chat the viewer is not in reads as missing. */
export async function readablePoll(ctx: Ctx, pollId: Id<'polls'>, workspace: Workspace): Promise<Doc<'polls'>> {
  const poll = await ctx.db.get('polls', pollId);
  if (!poll || poll.organizationId !== workspace.organizationId) throw new ConvexError('Poll not found');
  if (poll.tripId && !(await findVisibleTrip(ctx, poll.tripId, workspace))) throw new ConvexError('Poll not found');
  if (poll.discussionId) {
    await DiscussionAccess.forWorkspace(ctx, poll.discussionId, workspace).catch(() => {
      throw new ConvexError('Poll not found');
    });
  }
  return poll;
}

export async function canVote(ctx: Ctx, poll: Doc<'polls'>, workspace: Workspace): Promise<boolean> {
  if (poll.status !== 'open') return false;
  return (await eligibleVoters(ctx, poll)).some((voter) => voter.userId === workspace.userId);
}

/** The creator (or, for an agent's poll, the person who started the run) or a group admin. */
export async function canClose(ctx: Ctx, poll: Doc<'polls'>, workspace: Workspace): Promise<boolean> {
  if (isOrganizationManager(workspace.organizationRole)) return true;
  if (poll.createdBy.kind === 'user') return poll.createdBy.userId === workspace.userId;
  const run = await ctx.db.get('agentRuns', poll.createdBy.runId);
  return run?.createdBy.userId === workspace.userId;
}
```

- [ ] **Step 5: `polls/writes.ts`.**

```ts
import { ConvexError } from 'convex/values';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import type { Workspace } from '#convex/modules/auth/workspace';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import { canClose, canVote, readablePoll } from '#convex/modules/polls/access';
import { POLL_LIMITS, type PollCreateInput, type PollCreator } from '#convex/modules/polls/schema';
import { findVisibleTrip } from '#convex/modules/travel/trips/ctx';

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeQuestion(question: string): string {
  const trimmed = question.trim();
  if (trimmed.length === 0 || trimmed.length > POLL_LIMITS.questionLength) {
    throw new ConvexError(`A poll question needs 1 to ${POLL_LIMITS.questionLength} characters`);
  }
  return trimmed;
}

function normalizeOptions(options: string[]) {
  const labels = options.map((label) => label.trim());
  if (labels.length < POLL_LIMITS.minOptions || labels.length > POLL_LIMITS.maxOptions) {
    throw new ConvexError('A poll needs 2 to 10 options');
  }
  if (labels.some((label) => label.length === 0 || label.length > POLL_LIMITS.optionLength)) {
    throw new ConvexError(`Each option needs 1 to ${POLL_LIMITS.optionLength} characters`);
  }
  if (new Set(labels.map((label) => label.toLocaleLowerCase())).size !== labels.length) {
    throw new ConvexError('Options must be different');
  }
  return labels.map((label, index) => ({ id: `o${index + 1}`, label }));
}

async function signalPoll(ctx: MutationCtx, pollId: Id<'polls'>): Promise<void> {
  await AgentWaits.signal(ctx, { kind: 'poll', refId: pollId });
}

async function resolveScope(ctx: MutationCtx, workspace: Workspace, input: PollCreateInput) {
  let tripId = input.tripId;
  if (input.discussionId) {
    const access = await DiscussionAccess.forWorkspace(ctx, input.discussionId, workspace);
    access.assertWritable();
    const chatTrip = 'tripId' in access.discussion ? access.discussion.tripId : undefined;
    if (tripId && chatTrip && tripId !== chatTrip) throw new ConvexError('The poll trip must match the chat trip');
    tripId = tripId ?? chatTrip;
  }
  if (tripId) {
    const trip = await findVisibleTrip(ctx, tripId, workspace);
    if (!trip) throw new ConvexError('Trip not found');
    if (trip.proposal) throw new ConvexError('Polls belong to the shared trip, not an idea');
    if (trip.archive !== undefined) throw new ConvexError('Archived trips are read-only');
  }
  return { discussionId: input.discussionId, tripId };
}

async function create(
  ctx: MutationCtx,
  workspace: Workspace,
  input: PollCreateInput,
  creator: PollCreator
): Promise<Id<'polls'>> {
  const question = normalizeQuestion(input.question);
  const options = normalizeOptions(input.options);
  const now = Date.now();
  if (input.closesAt !== undefined && (input.closesAt <= now || input.closesAt - now > POLL_LIMITS.maxOpenDays * DAY_MS)) {
    throw new ConvexError('A poll must close in the future, at most 14 days from now');
  }
  const scope = await resolveScope(ctx, workspace, input);
  const pollId = await ctx.db.insert('polls', {
    ...(input.closesAt === undefined ? {} : { closesAt: input.closesAt }),
    createdBy: creator,
    ...(scope.discussionId ? { discussionId: scope.discussionId } : {}),
    multiSelect: input.multiSelect,
    options,
    organizationId: workspace.organizationId,
    question,
    status: 'open',
    ...(scope.tripId ? { tripId: scope.tripId } : {}),
    updatedAt: now
  });
  if (input.closesAt !== undefined) {
    await ctx.scheduler.runAt(input.closesAt, internal.modules.polls.functions.closeScheduled, { pollId });
  }
  return pollId;
}

async function vote(ctx: MutationCtx, workspace: Workspace, pollId: Id<'polls'>, optionIds: string[]): Promise<null> {
  const poll = await readablePoll(ctx, pollId, workspace);
  if (poll.status !== 'open') throw new ConvexError('This poll is closed');
  if (!(await canVote(ctx, poll, workspace))) throw new ConvexError('You cannot vote on this poll');
  const unique = [...new Set(optionIds)];
  if (unique.length === 0) throw new ConvexError('Pick an option');
  if (!poll.multiSelect && unique.length !== 1) throw new ConvexError('Pick one option');
  const known = new Set(poll.options.map((option) => option.id));
  if (unique.some((id) => !known.has(id))) throw new ConvexError('Unknown option');
  const existing = await ctx.db
    .query('pollVotes')
    .withIndex('by_pollId_and_userId', (query) => query.eq('pollId', pollId).eq('userId', workspace.userId))
    .unique();
  const now = Date.now();
  if (existing) await ctx.db.patch('pollVotes', existing._id, { optionIds: unique, updatedAt: now });
  else {
    await ctx.db.insert('pollVotes', {
      name: workspace.viewerName,
      optionIds: unique,
      organizationId: workspace.organizationId,
      pollId,
      updatedAt: now,
      userId: workspace.userId
    });
  }
  await signalPoll(ctx, pollId);
  return null;
}

async function retract(ctx: MutationCtx, workspace: Workspace, pollId: Id<'polls'>): Promise<null> {
  const poll = await readablePoll(ctx, pollId, workspace);
  if (poll.status !== 'open') throw new ConvexError('This poll is closed');
  const existing = await ctx.db
    .query('pollVotes')
    .withIndex('by_pollId_and_userId', (query) => query.eq('pollId', pollId).eq('userId', workspace.userId))
    .unique();
  if (!existing) return null;
  await ctx.db.delete('pollVotes', existing._id);
  await signalPoll(ctx, pollId);
  return null;
}

async function closePoll(ctx: MutationCtx, pollId: Id<'polls'>): Promise<null> {
  const now = Date.now();
  await ctx.db.patch('polls', pollId, { closedAt: now, status: 'closed', updatedAt: now });
  await signalPoll(ctx, pollId);
  return null;
}

async function close(ctx: MutationCtx, workspace: Workspace, pollId: Id<'polls'>): Promise<null> {
  const poll = await readablePoll(ctx, pollId, workspace);
  if (poll.status === 'closed') return null;
  if (!(await canClose(ctx, poll, workspace))) {
    throw new ConvexError('Only the poll creator or a group admin can close this poll');
  }
  return await closePoll(ctx, pollId);
}

async function closeScheduled(ctx: MutationCtx, pollId: Id<'polls'>): Promise<null> {
  const poll = await ctx.db.get('polls', pollId);
  if (poll?.status !== 'open') return null;
  return await closePoll(ctx, pollId);
}

export const PollWrites = { close, closeScheduled, create, retract, vote };
```

- [ ] **Step 6: `polls/reads.ts`.**

```ts
import type { Doc, Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import type { Workspace } from '#convex/modules/auth/workspace';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import { canClose, readablePoll } from '#convex/modules/polls/access';
import { eligibleVoters, pollVotes } from '#convex/modules/polls/eligibility';
import type { PollView } from '#convex/modules/polls/schema';
import { tallyPoll } from '#convex/modules/polls/tally';
import { findVisibleTrip } from '#convex/modules/travel/trips/ctx';

const LIST_LIMIT = 50;

async function present(ctx: QueryCtx, poll: Doc<'polls'>, workspace: Workspace): Promise<PollView> {
  const [eligible, votes, closable] = await Promise.all([
    eligibleVoters(ctx, poll),
    pollVotes(ctx, poll),
    canClose(ctx, poll, workspace)
  ]);
  const tally = tallyPoll(poll.options, votes, eligible);
  return {
    canClose: poll.status === 'open' && closable,
    canVote: poll.status === 'open' && eligible.some((voter) => voter.userId === workspace.userId),
    closedAt: poll.closedAt ?? null,
    closesAt: poll.closesAt ?? null,
    createdAt: poll._creationTime,
    createdBy: { kind: poll.createdBy.kind, name: poll.createdBy.name },
    discussionId: poll.discussionId ?? null,
    eligibleCount: tally.eligibleCount,
    id: poll._id,
    multiSelect: poll.multiSelect,
    myOptionIds: votes.find((vote) => vote.userId === workspace.userId)?.optionIds ?? [],
    question: poll.question,
    status: poll.status,
    tallies: tally.tallies,
    tripId: poll.tripId ?? null,
    votedCount: tally.votedCount,
    voters: tally.voted
  };
}

async function get(ctx: QueryCtx, workspace: Workspace, pollId: Id<'polls'>) {
  return await present(ctx, await readablePoll(ctx, pollId, workspace), workspace);
}

async function readable(ctx: QueryCtx, workspace: Workspace, polls: Array<Doc<'polls'>>) {
  const visible = await Promise.all(
    polls.map((poll) => readablePoll(ctx, poll._id, workspace).then(() => true, () => false))
  );
  const kept = polls.filter((_, index) => visible[index]).sort((a, b) => b._creationTime - a._creationTime);
  return await Promise.all(kept.map((poll) => present(ctx, poll, workspace)));
}

async function listForTrip(ctx: QueryCtx, workspace: Workspace, tripId: Id<'trips'>) {
  if (!(await findVisibleTrip(ctx, tripId, workspace))) return [];
  const [open, closed] = await Promise.all(
    (['open', 'closed'] as const).map((status) =>
      ctx.db.query('polls').withIndex('by_tripId_and_status', (query) => query.eq('tripId', tripId).eq('status', status)).order('desc').take(LIST_LIMIT)
    )
  );
  return await readable(ctx, workspace, [...(open ?? []), ...(closed ?? [])]);
}

async function listForWorkspace(ctx: QueryCtx, workspace: Workspace) {
  const [open, closed] = await Promise.all(
    (['open', 'closed'] as const).map((status) =>
      ctx.db
        .query('polls')
        .withIndex('by_organizationId_and_status', (query) => query.eq('organizationId', workspace.organizationId).eq('status', status))
        .order('desc')
        .take(LIST_LIMIT)
    )
  );
  return await readable(ctx, workspace, [...(open ?? []), ...(closed ?? [])].filter((poll) => !poll.tripId));
}

async function listForDiscussion(ctx: QueryCtx, workspace: Workspace, discussionId: Id<'discussions'>) {
  await DiscussionAccess.forWorkspace(ctx, discussionId, workspace);
  const polls = await ctx.db
    .query('polls')
    .withIndex('by_discussionId', (query) => query.eq('discussionId', discussionId))
    .order('desc')
    .take(LIST_LIMIT);
  return await readable(ctx, workspace, polls);
}

export const PollReads = { get, listForDiscussion, listForTrip, listForWorkspace, present };
```

- [ ] **Step 7: Facade, scheduled close, routes.**

```ts
// polls/index.ts
import { PollReads } from '#convex/modules/polls/reads';
import { PollWrites } from '#convex/modules/polls/writes';

/** Group polls and votes. Writes signal poll waits; this module knows nothing about agents' turns. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class Polls {
  static close = PollWrites.close;
  static closeScheduled = PollWrites.closeScheduled;
  static create = PollWrites.create;
  static get = PollReads.get;
  static listForDiscussion = PollReads.listForDiscussion;
  static listForTrip = PollReads.listForTrip;
  static listForWorkspace = PollReads.listForWorkspace;
  static retract = PollWrites.retract;
  static vote = PollWrites.vote;
}
```

```ts
// polls/functions.ts
import { v } from 'convex/values';
import { internalMutation } from '#convex-generated/server';
import { Polls } from '#convex/modules/polls/index';

export const closeScheduled = internalMutation({
  args: { pollId: v.id('polls') },
  returns: v.null(),
  handler: (ctx, { pollId }) => Polls.closeScheduled(ctx, pollId)
});
```

Routes (each file exports only `run`):

```ts
// routes/polls/create.ts
import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { Polls } from '#convex/modules/polls/index';
import { PollValidators } from '#convex/modules/polls/schema';

export const run = workspaceMutation({
  args: PollValidators.createInput,
  returns: v.id('polls'),
  handler: (ctx, input) =>
    Polls.create(ctx, ctx.workspace, input, { kind: 'user', name: ctx.workspace.viewerName, userId: ctx.workspace.userId })
});
```

```ts
// routes/polls/vote.ts
export const run = workspaceMutation({
  args: { optionIds: v.array(v.string()), pollId: v.id('polls') },
  returns: v.null(),
  handler: (ctx, { optionIds, pollId }) => Polls.vote(ctx, ctx.workspace, pollId, optionIds)
});
// routes/polls/retract.ts
export const run = workspaceMutation({
  args: { pollId: v.id('polls') },
  returns: v.null(),
  handler: (ctx, { pollId }) => Polls.retract(ctx, ctx.workspace, pollId)
});
// routes/polls/close.ts
export const run = workspaceMutation({
  args: { pollId: v.id('polls') },
  returns: v.null(),
  handler: (ctx, { pollId }) => Polls.close(ctx, ctx.workspace, pollId)
});
// routes/polls/get.ts
export const run = workspaceQuery({
  args: { pollId: v.id('polls') },
  returns: PollValidators.view,
  handler: (ctx, { pollId }) => Polls.get(ctx, ctx.workspace, pollId)
});
// routes/polls/list/trip.ts
export const run = workspaceQuery({
  args: { tripId: v.id('trips') },
  returns: v.array(PollValidators.view),
  handler: (ctx, { tripId }) => Polls.listForTrip(ctx, ctx.workspace, tripId)
});
// routes/polls/list/workspace.ts
export const run = workspaceQuery({
  args: {},
  returns: v.array(PollValidators.view),
  handler: (ctx) => Polls.listForWorkspace(ctx, ctx.workspace)
});
// routes/polls/list/discussion.ts
export const run = workspaceQuery({
  args: { discussionId: v.id('discussions') },
  returns: v.array(PollValidators.view),
  handler: (ctx, { discussionId }) => Polls.listForDiscussion(ctx, ctx.workspace, discussionId)
});
```

(Imports per file: `v` from `convex/values`, the builder from `#convex/modules/auth/workspace`, `Polls` and `PollValidators` as needed.)

- [ ] **Step 8: Run, expect pass.** `cd /workspaces/groam && just codegen && cd packages/backend && vp test run convex/modules/polls` → PASS.

---

### Task 3.4: `createPoll` tool and poll `waitFor`

**Files:**
- Modify: `packages/ai/src/tools/specs.ts` (`'poll.create'` after `'context.workspace.find'`)
- Modify: `packages/ai/src/tools/specs.test.ts` (issue oracle adds `'poll.create'` after `'context.workspace.find'`)
- Create: `packages/backend/convex/modules/assistant/model/polls.ts`
- Create: `packages/backend/assistant/tools/agent/polls.ts`
- Create: `packages/backend/assistant/tools/agent/polls.test.ts`
- Modify: `packages/backend/assistant/tools/agent/waits.ts` (poll variant in `waitConditionInputSchema`; export `pollRuleInputSchema`)
- Modify: `packages/backend/assistant/tools/kinds/index.ts` (binding)
- Create: `packages/backend/convex/modules/polls/poll-agent.test.ts`

**Interfaces:**
- Produces capability `'poll.create'` (`createPoll`), agents `['groam', 'issue']`.
- Produces `internal.modules.assistant.model.polls.createPoll` (internalWorkspaceMutation; args `{ activeTripId?: Id<'trips'>; multiSelect: boolean; options: string[]; question: string; waitFor?: { deadlineAt: number; rule: PollRule[] } }` → `{ pollId: Id<'polls'>; waitId: Id<'agentWaits'> | null }`).
- Produces `createPollTool(activeTripId: Id<'trips'> | null)` with output `{ pollId; wait: boolean; waitId: string | null }`.

- [ ] **Step 1: Failing tests.** `assistant/tools/agent/polls.test.ts`:

```ts
import { expect, test, vi } from 'vite-plus/test';

vi.mock('@convex-dev/agent', () => ({ createTool: <Definition>(definition: Definition) => definition }));

import { createPollTool } from '#backend/assistant/tools/agent/polls';

type Executable = { execute: (ctx: unknown, input: unknown) => Promise<unknown> };

test('createPoll attaches the active trip and turns waitFor hours into a deadline', async () => {
  vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));
  const calls: unknown[] = [];
  const tool = createPollTool('trip-1' as never) as unknown as Executable;
  const output = await tool.execute(
    { runMutation: async (_ref: unknown, args: unknown) => { calls.push(args); return { pollId: 'p', waitId: 'w' }; } },
    { multiSelect: false, options: ['Sushi', 'Tapas'], question: 'Dinner Friday?', waitFor: { deadlineHours: 24, rule: [{ kind: 'optionVotes', majority: true }] } }
  );
  expect(calls).toEqual([
    {
      activeTripId: 'trip-1',
      multiSelect: false,
      options: ['Sushi', 'Tapas'],
      question: 'Dinner Friday?',
      waitFor: { deadlineAt: Date.parse('2026-10-18T10:00:00Z'), rule: [{ kind: 'optionVotes', majority: true }] }
    }
  ]);
  expect(output).toEqual({ pollId: 'p', wait: true, waitId: 'w' });
  vi.useRealTimers();
});
```

`modules/polls/poll-agent.test.ts` (the agent end-to-end; deviation 8):

```ts
import { mockModel } from '@convex-dev/agent';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { setupTrip } from '#testing/trips';
import { runUntil } from '#testing/workflows';

vi.useRealTimers();
afterEach(() => vi.restoreAllMocks());

test('an agent asks the group with a poll, waits, and continues when everyone voted', async () => {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: mockModel({
      contentSteps: [
        [
          {
            input: JSON.stringify({
              multiSelect: false,
              options: ['Sushi', 'Tapas'],
              question: 'Dinner Friday',
              waitFor: { deadlineHours: 24, rule: [{ kind: 'allVoted' }] }
            }),
            toolCallId: 'poll-1',
            toolName: 'createPoll',
            type: 'tool-call' as const
          }
        ],
        [{ text: 'Sushi it is — I will add it to Friday.', type: 'text' as const }]
      ]
    }),
    modelId: 'm'
  } as never);
  const { owner, tripId, users } = await setupTrip(1);
  const [member] = users;
  if (!member) throw new Error('Expected a member');
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [member.userId],
    title: 'Dinner',
    tripId
  });
  const sent = await owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId,
    text: '@groam ask everyone where to eat Friday'
  });
  await owner.client.mutation(api.routes.discussions.messages.respond.run, {
    discussionId,
    promptMessageId: sent.messageId,
    screen: { capabilities: [], data: '{}', description: 'Chat', key: `chat:${discussionId}`, target: { kind: 'workspace' }, title: 'Dinner' }
  });
  const run = () =>
    owner.test.run((ctx) =>
      ctx.db.query('agentRuns').withIndex('by_discussionId_and_updatedAt', (query) => query.eq('discussionId', discussionId)).first()
    );
  await runUntil(owner.test, async () => (await run())?.status === 'waiting');
  const [poll] = await owner.client.query(api.routes.polls.list.discussion.run, { discussionId });
  if (!poll) throw new Error('Expected the agent poll');
  expect(poll).toMatchObject({ createdBy: { kind: 'agent', name: 'Groam' }, eligibleCount: 2, tripId });
  await owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId: poll.id });
  await member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId: poll.id });
  await runUntil(owner.test, async () => (await run())?.status === 'complete');
  expect(await run()).toMatchObject({ report: 'Sushi it is — I will add it to Friday.', status: 'complete' });
  const wait = await owner.test.run(async (ctx) =>
    ctx.db.query('agentWaits').withIndex('by_runId', (query) => query.eq('runId', (await run())?._id as Id<'agentRuns'>)).unique()
  );
  expect(wait?.outcome?.summary).toBe("everyone voted for 'Dinner Friday' — Sushi 2, Tapas 0; 2 of 2 voted");
});
```

- [ ] **Step 2: Run, expect fail.**
`cd /workspaces/groam/packages/backend && vp test run assistant/tools/agent/polls.test.ts convex/modules/polls/poll-agent.test.ts` → FAIL.
- [ ] **Step 3: Spec entry.**

```ts
  'poll.create': {
    agents: ['groam', 'issue'],
    eventLabel: { complete: 'Asked the group', running: 'Creating a poll' },
    guidance:
      'Use createPoll when a decision affects everyone in the group and you need their preferences instead of guessing. Keep options short (2–10). Add waitFor to resume automatically: allVoted for small binding choices, optionVotes majority for quick picks, quorum for large groups, closed when the organizer will close it. Always set a sensible deadline (hours for quick picks, a few days for bigger decisions, at most 14 days). After creating a poll with waitFor, stop; you continue with the result.',
    id: 'poll.create',
    toolName: 'createPoll',
    ui: { card: 'activity' }
  },
```

- [ ] **Step 4: Internal entry point.** `modules/assistant/model/polls.ts`:

```ts
import { assistantAgents } from '@groam/ai/agents';
import { ConvexError, v } from 'convex/values';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { internalWorkspaceMutation } from '#convex/modules/auth/workspace';
import { Polls } from '#convex/modules/polls/index';
import { PollValidators } from '#convex/modules/polls/schema';

/** createPoll: the poll lives in the run's chat (and its trip), else the active trip, else the group. */
export const createPoll = internalWorkspaceMutation({
  args: {
    activeTripId: v.optional(v.id('trips')),
    multiSelect: v.boolean(),
    options: v.array(v.string()),
    question: v.string(),
    waitFor: v.optional(v.object({ deadlineAt: v.number(), rule: v.array(PollValidators.rule) }))
  },
  returns: v.object({ pollId: v.id('polls'), waitId: v.union(v.id('agentWaits'), v.null()) }),
  handler: async (ctx, { activeTripId, multiSelect, options, question, waitFor }) => {
    const runId = ctx.workspace.runId;
    const run = runId ? await ctx.db.get('agentRuns', runId) : null;
    if (!runId || !run) throw new ConvexError('Only an agent run can create a poll this way');
    const pollId = await Polls.create(
      ctx,
      ctx.workspace,
      {
        ...(run.discussionId ? { discussionId: run.discussionId } : {}),
        multiSelect,
        options,
        question,
        ...(!run.discussionId && (activeTripId ?? run.tripId) ? { tripId: activeTripId ?? run.tripId } : {})
      },
      { agentId: run.agentId, kind: 'agent', name: assistantAgents[run.agentId].label, runId }
    );
    if (!waitFor) return { pollId, waitId: null };
    const { waitId } = await AgentWaits.create(ctx, {
      condition: { kind: 'poll', pollId, rule: waitFor.rule },
      deadlineAt: waitFor.deadlineAt,
      runId
    });
    return { pollId, waitId };
  }
});
```

- [ ] **Step 5: Tool.** `assistant/tools/agent/waits.ts` gains:

```ts
export const pollRuleInputSchema = z.union([
  z.object({ kind: z.literal('allVoted') }),
  z.object({ count: z.number().int().min(1), kind: z.literal('quorum') }),
  z.object({ kind: z.literal('quorum'), percent: z.number().min(1).max(100) }),
  z.object({ kind: z.literal('optionVotes'), min: z.number().int().min(1) }),
  z.object({ kind: z.literal('optionVotes'), majority: z.literal(true) }),
  z.object({ kind: z.literal('closed') })
]);
```

and the `waitConditionInputSchema` union adds
`z.object({ kind: z.literal('poll'), pollId: z.string(), rule: z.array(pollRuleInputSchema).min(1) }).describe('Resume when any listed rule holds for an existing poll.')`; `createWaitForTool` maps `pollId` with `as Id<'polls'>`.

`assistant/tools/agent/polls.ts`:

```ts
import { createTool } from '@convex-dev/agent';
import * as z from 'zod/v3';
import { deadlineHoursField, pollRuleInputSchema } from '#backend/assistant/tools/agent/waits';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

const HOUR_MS = 60 * 60 * 1000;

export function createPollTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Ask the group a multiple-choice question. Optionally wait for an outcome; then stop and resume with the result.',
    execute: async (toolCtx, input) => {
      const created = await toolCtx.runMutation(internal.modules.assistant.model.polls.createPoll, {
        ...(activeTripId ? { activeTripId } : {}),
        multiSelect: input.multiSelect,
        options: input.options,
        question: input.question,
        ...(input.waitFor
          ? { waitFor: { deadlineAt: Date.now() + input.waitFor.deadlineHours * HOUR_MS, rule: input.waitFor.rule } }
          : {})
      });
      return { pollId: created.pollId, wait: created.waitId !== null, waitId: created.waitId };
    },
    inputSchema: z.object({
      multiSelect: z.boolean().default(false).describe('Let people pick more than one option.'),
      options: z.array(z.string().min(1).max(80)).min(2).max(10),
      question: z.string().min(1).max(200),
      waitFor: z
        .object({ deadlineHours: deadlineHoursField, rule: z.array(pollRuleInputSchema).min(1) })
        .optional()
        .describe('Resume this run when any rule holds, or at the deadline.')
    })
  });
}
```

Binding: `'poll.create': defineCapability({ ...assistantToolSpecs['poll.create'], create: ({ activeTripId, actorRunId }) => (actorRunId ? createPollTool(activeTripId) : null) })`.

- [ ] **Step 6: Run, expect pass.** Step 2 commands plus `cd /workspaces/groam/packages/ai && vp test run src/tools` → PASS.

---

### Task 3.5: Poll UI — card, dialog, trip section, chat cards, composer action

**Files:**
- Create: `apps/web/src/types/polls.ts`
- Create: `apps/web/src/features/polls/hooks/use-polls.ts` (+ `use-polls.test.tsx`)
- Create: `apps/web/src/features/polls/poll-card/poll-card.tsx` (+ test)
- Create: `apps/web/src/features/polls/poll-card/poll-option-button.tsx` (+ test)
- Create: `apps/web/src/features/polls/create-poll/create-poll-dialog.tsx` (+ test)
- Create: `apps/web/src/features/polls/trip-polls/trip-polls-panel.tsx` (+ test)
- Create: `apps/web/src/features/discussions/discussion-thread/discussion-thread-with-polls.tsx` (+ test)
- Modify: `apps/web/src/features/discussions/discussion-thread/discussion-thread-view.tsx`
- Modify: `apps/web/src/features/trips/trip-sections.ts` (+ `trip-sections.test.ts`)
- Modify: `apps/web/src/features/trips/trip-detail/active-trip-section.tsx:52-61`
- Modify: `apps/web/src/features/trips/trip-detail/trip-section-nav.tsx:13-21`
- Modify: `apps/web/src/features/trips/hooks/use-trip-agent-context.ts` (needs, data, `polls` section, `assistantSection`)
- Modify: `tooling/app-actions/src/testing/ids.ts`, `tooling/app-actions/src/vitest/open-trips.ts`, `tooling/app-actions/src/playwright/open-trip-section.ts`

**Interfaces:**
- Produces: `type Poll = FunctionReturnType<typeof api.routes.polls.get.run>`.
- Produces hooks: `useTripPolls(tripId?: Id<'trips'>) → { isLoading: boolean; polls: Poll[] }`, `useDiscussionPolls(discussionId) → { polls: Poll[] }`, `usePollActions() → { close(pollId): Promise<boolean>; create(input: FunctionArgs<typeof api.routes.polls.create.run>): Promise<Id<'polls'> | null>; retract(pollId): Promise<boolean>; vote(pollId, optionIds: string[]): Promise<boolean> }`.
- Produces components: `PollCard({ poll, onClose, onRetract, onVote })`, `PollOptionButton({ count, label, multiSelect, onToggle, selected, share, disabled })`, `CreatePollDialog({ onClose, onCreate, open })`, `TripPollsPanel({ trip })`, `DiscussionThreadWithPolls({ discussionId, threadId })`.
- Test ids (alphabetical in `ids.ts`): `createPollAddOption: 'create-poll-add-option'`, `createPollDialog: 'create-poll-dialog'`, `pollCard: 'poll-card'`, `pollClose: 'poll-close'`, `pollOption: 'poll-option'`, `pollRetract: 'poll-retract'`, `tripPollsCreate: 'trip-polls-create'`, `tripPollsPanel: 'trip-polls-panel'`, `tripSectionPolls: 'trip-section-polls'`.

- [ ] **Step 1: Failing view tests.** `poll-card.test.tsx`:

```tsx
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { Poll } from '@/types/polls';
import { PollCard } from './poll-card';

const poll = (overrides: Partial<Poll> = {}): Poll =>
  ({
    canClose: true,
    canVote: true,
    closedAt: null,
    closesAt: null,
    createdAt: 1,
    createdBy: { kind: 'agent', name: 'Groam' },
    discussionId: null,
    eligibleCount: 5,
    id: 'poll-1',
    multiSelect: false,
    myOptionIds: [],
    question: 'Dinner Friday',
    status: 'open',
    tallies: [
      { count: 2, id: 'o1', label: 'Sushi' },
      { count: 1, id: 'o2', label: 'Tapas' }
    ],
    tripId: null,
    votedCount: 3,
    voters: [{ name: 'Ana', userId: 'u1' }, { name: 'Ben', userId: 'u2' }, { name: 'Cy', userId: 'u3' }],
    ...overrides
  }) as Poll;

test('an open poll shows progress, tallies, voters, and votes on click', async () => {
  const onVote = vi.fn().mockResolvedValue(true);
  await render(<PollCard onClose={vi.fn()} onRetract={vi.fn()} onVote={onVote} poll={poll()} />);
  await expect.element(page.getByText('Dinner Friday')).toBeVisible();
  await expect.element(page.getByText('3 of 5 voted')).toBeVisible();
  await expect.element(page.getByText('Asked by Groam')).toBeVisible();
  await expect.element(page.getByText('Ana, Ben, Cy')).toBeVisible();
  await page.getByRole('radio', { name: /Sushi/ }).click();
  expect(onVote).toHaveBeenCalledWith(['o1']);
});

test('changing a single-select vote replaces it; retract clears it', async () => {
  const onVote = vi.fn().mockResolvedValue(true);
  const onRetract = vi.fn().mockResolvedValue(true);
  await render(<PollCard onClose={vi.fn()} onRetract={onRetract} onVote={onVote} poll={poll({ myOptionIds: ['o1'] })} />);
  await expect.element(page.getByRole('radio', { name: /Sushi/ })).toBeChecked();
  await page.getByRole('radio', { name: /Tapas/ }).click();
  expect(onVote).toHaveBeenCalledWith(['o2']);
  await page.getByTestId(testIds.pollRetract).click();
  expect(onRetract).toHaveBeenCalledOnce();
});

test('multi-select toggles options independently', async () => {
  const onVote = vi.fn().mockResolvedValue(true);
  await render(<PollCard onClose={vi.fn()} onRetract={vi.fn()} onVote={onVote} poll={poll({ multiSelect: true, myOptionIds: ['o1'] })} />);
  await page.getByRole('checkbox', { name: /Tapas/ }).click();
  expect(onVote).toHaveBeenCalledWith(['o1', 'o2']);
});

test('a closed poll is read-only and says so', async () => {
  await render(<PollCard onClose={vi.fn()} onRetract={vi.fn()} onVote={vi.fn()} poll={poll({ canClose: false, canVote: false, status: 'closed' })} />);
  await expect.element(page.getByText('Closed')).toBeVisible();
  await expect.element(page.getByRole('radio', { name: /Sushi/ })).toBeDisabled();
  expect(page.getByTestId(testIds.pollClose).elements()).toHaveLength(0);
});
```

`create-poll-dialog.test.tsx`:

```tsx
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { CreatePollDialog } from './create-poll-dialog';

test('submits a trimmed question with at least two options', async () => {
  const onCreate = vi.fn().mockResolvedValue(true);
  const onClose = vi.fn();
  await render(<CreatePollDialog onClose={onClose} onCreate={onCreate} open />);
  const submit = page.getByRole('button', { name: 'Create poll' });
  await expect.element(submit).toBeDisabled();
  await userEvent.fill(page.getByLabelText('Question'), '  Where to eat?  ');
  await userEvent.fill(page.getByLabelText('Option 1'), 'Sushi');
  await userEvent.fill(page.getByLabelText('Option 2'), 'Tapas');
  await page.getByTestId(testIds.createPollAddOption).click();
  await userEvent.fill(page.getByLabelText('Option 3'), 'Pizza');
  await page.getByLabelText('Allow several choices').click();
  await submit.click();
  expect(onCreate).toHaveBeenCalledWith({ multiSelect: true, options: ['Sushi', 'Tapas', 'Pizza'], question: 'Where to eat?' });
  expect(onClose).toHaveBeenCalled();
});

test('caps options at ten', async () => {
  await render(<CreatePollDialog onClose={vi.fn()} onCreate={vi.fn()} open />);
  for (let index = 0; index < 8; index++) await page.getByTestId(testIds.createPollAddOption).click();
  await expect.element(page.getByTestId(testIds.createPollAddOption)).toBeDisabled();
});
```

`trip-polls-panel.test.tsx`: mock `@/features/polls/hooks/use-polls` (`useTripPolls` → state, `usePollActions` → spies); tests: loading state has `role="status"` named `Loading polls…`; empty state shows "No polls yet" with the `tripPollsCreate` button; a list renders one `pollCard` per poll; archived trip (`trip.archivedAt !== null`) hides the create button.

`discussion-thread-with-polls.test.tsx`: mock `DiscussionThreadBody` to render its `events` and `commands` props (`vi.mock('./discussion-thread-body', () => ({ DiscussionThreadBody: (props) => <div>{props.events.map((e) => <div key={e.key}>{e.content}</div>)}<button onClick={() => props.commands[0].run('')}>/poll</button></div> }))`), mock `use-polls`; assert a poll card renders and `/poll` opens the dialog (`createPollDialog` visible).

`use-polls.test.tsx`: mock `convex/react`; `useTripPolls(undefined)` passes `'skip'`; `vote` returns `false` and calls `toast.error` with `Unable to vote` when the mutation rejects.

- [ ] **Step 2: Run, expect fail.** `cd /workspaces/groam/apps/web && vp test run --project views src/features/polls src/features/discussions/discussion-thread/discussion-thread-with-polls.test.tsx` → FAIL.
- [ ] **Step 3: Types and hooks.**

```ts
// apps/web/src/types/polls.ts
import type { api } from '@groam/backend/api';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';

export type Poll = FunctionReturnType<typeof api.routes.polls.get.run>;
export type CreatePollInput = FunctionArgs<typeof api.routes.polls.create.run>;
```

```ts
// apps/web/src/features/polls/hooks/use-polls.ts
import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation, useQuery } from 'convex/react';
import { useCallback, useMemo } from 'react';
import { errorMessage } from '@/lib/errors';
import type { CreatePollInput, Poll } from '@/types/polls';

const none: Poll[] = [];

export function useTripPolls(tripId: Id<'trips'> | undefined) {
  const polls = useQuery(api.routes.polls.list.trip.run, tripId ? { tripId } : 'skip');
  return { isLoading: tripId !== undefined && polls === undefined, polls: polls ?? none };
}

export function useDiscussionPolls(discussionId: Id<'discussions'>) {
  return { polls: useQuery(api.routes.polls.list.discussion.run, { discussionId }) ?? none };
}

async function attempt<T>(run: () => Promise<T>, failure: string): Promise<T | null> {
  try {
    return await run();
  } catch (error: unknown) {
    toast.error(errorMessage(error, failure));
    return null;
  }
}

export function usePollActions() {
  const createMutation = useMutation(api.routes.polls.create.run);
  const voteMutation = useMutation(api.routes.polls.vote.run);
  const retractMutation = useMutation(api.routes.polls.retract.run);
  const closeMutation = useMutation(api.routes.polls.close.run);
  const create = useCallback((input: CreatePollInput) => attempt(() => createMutation(input), 'Unable to create the poll'), [createMutation]);
  const vote = useCallback(
    async (pollId: Id<'polls'>, optionIds: string[]) =>
      (await attempt(() => voteMutation({ optionIds, pollId }), 'Unable to vote')) !== null,
    [voteMutation]
  );
  const retract = useCallback(
    async (pollId: Id<'polls'>) => (await attempt(() => retractMutation({ pollId }), 'Unable to remove your vote')) !== null,
    [retractMutation]
  );
  const close = useCallback(
    async (pollId: Id<'polls'>) => (await attempt(() => closeMutation({ pollId }), 'Unable to close the poll')) !== null,
    [closeMutation]
  );
  return useMemo(() => ({ close, create, retract, vote }), [close, create, retract, vote]);
}
```

- [ ] **Step 4: `poll-option-button.tsx`.**

```tsx
import { cn } from '@groam/ui/lib/utils';
import { testIds } from '@/lib/test-ids';

/** One option: a radio or checkbox row with its share of votes drawn behind the label. */
export function PollOptionButton({
  count,
  disabled,
  label,
  multiSelect,
  onToggle,
  selected,
  share
}: {
  count: number;
  disabled: boolean;
  label: string;
  multiSelect: boolean;
  onToggle: () => void;
  selected: boolean;
  share: number;
}) {
  return (
    <button
      aria-checked={selected}
      className={cn(
        'relative flex w-full items-center justify-between overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
        disabled && 'cursor-default hover:bg-transparent'
      )}
      data-testid={testIds.pollOption}
      disabled={disabled}
      onClick={onToggle}
      role={multiSelect ? 'checkbox' : 'radio'}
      type="button"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${Math.round(share * 100)}%` }} />
      <span className="relative font-medium text-foreground">{label}</span>
      <span className="relative text-xs tabular-nums text-muted-foreground">{count}</span>
    </button>
  );
}
```

- [ ] **Step 5: `poll-card.tsx`.**

```tsx
import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { Vote } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import type { Poll } from '@/types/polls';
import { PollOptionButton } from './poll-option-button';

function nextSelection(poll: Poll, optionId: string): string[] {
  if (!poll.multiSelect) return [optionId];
  return poll.myOptionIds.includes(optionId)
    ? poll.myOptionIds.filter((id) => id !== optionId)
    : [...poll.myOptionIds, optionId];
}

/** A poll with live tallies. Voting again replaces the vote; an empty multi-select retracts it. */
export function PollCard({
  onClose,
  onRetract,
  onVote,
  poll
}: {
  onClose: () => Promise<unknown>;
  onRetract: () => Promise<unknown>;
  onVote: (optionIds: string[]) => Promise<unknown>;
  poll: Poll;
}) {
  const closed = poll.status === 'closed';
  const radiogroup = poll.multiSelect ? 'group' : 'radiogroup';
  return (
    <article
      aria-label={`Poll: ${poll.question}`}
      className="w-full max-w-[min(100%,32rem)] rounded-xl border border-border/70 bg-card p-3 text-card-foreground shadow-xs/5"
      data-poll-id={poll.id}
      data-testid={testIds.pollCard}
    >
      <header className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Vote aria-hidden className="size-3.5" />
            Asked by {poll.createdBy.name}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-foreground">{poll.question}</h3>
        </div>
        {closed ? <Badge variant="secondary">Closed</Badge> : null}
      </header>
      <div aria-label={poll.question} className="flex flex-col gap-1.5" role={radiogroup}>
        {poll.tallies.map((option) => (
          <PollOptionButton
            count={option.count}
            disabled={closed || !poll.canVote}
            key={option.id}
            label={option.label}
            multiSelect={poll.multiSelect}
            onToggle={() => {
              const next = nextSelection(poll, option.id);
              void (next.length === 0 ? onRetract() : onVote(next));
            }}
            selected={poll.myOptionIds.includes(option.id)}
            share={poll.votedCount === 0 ? 0 : option.count / poll.votedCount}
          />
        ))}
      </div>
      <footer className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {poll.votedCount} of {poll.eligibleCount} voted
          {poll.voters.length > 0 ? <span className="ml-1.5">· {poll.voters.map((voter) => voter.name).join(', ')}</span> : null}
        </span>
        <span className="flex gap-1">
          {!closed && poll.myOptionIds.length > 0 ? (
            <Button data-testid={testIds.pollRetract} onClick={() => void onRetract()} size="xs" variant="ghost">
              Remove my vote
            </Button>
          ) : null}
          {poll.canClose ? (
            <Button data-testid={testIds.pollClose} onClick={() => void onClose()} size="xs" variant="outline">
              Close poll
            </Button>
          ) : null}
        </span>
      </footer>
    </article>
  );
}
```

(The view test's `'Ana, Ben, Cy'` matches the voters span text after the `· ` prefix; assert with `getByText('Ana, Ben, Cy', { exact: false })` if the separator joins the node.)

- [ ] **Step 6: `create-poll-dialog.tsx`.**

```tsx
import { Button } from '@groam/ui/components/button';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { Input } from '@groam/ui/components/input';
import { Label } from '@groam/ui/components/label';
import { Switch } from '@groam/ui/components/switch';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { testIds } from '@/lib/test-ids';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

export type CreatePollDraft = { multiSelect: boolean; options: string[]; question: string };

/** Question, 2–10 options, single or multiple choice. */
export function CreatePollDialog({
  onClose,
  onCreate,
  open
}: {
  onClose: () => void;
  onCreate: (draft: CreatePollDraft) => Promise<unknown>;
  open: boolean;
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiSelect, setMultiSelect] = useState(false);
  const [pending, setPending] = useState(false);
  const filled = options.map((option) => option.trim()).filter(Boolean);
  const ready = question.trim().length > 0 && filled.length >= MIN_OPTIONS;
  const reset = () => {
    setQuestion('');
    setOptions(['', '']);
    setMultiSelect(false);
  };
  return (
    <FormDialog
      description="Everyone who can vote sees it right away."
      isPending={pending}
      onClose={onClose}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!ready) return;
        setPending(true);
        try {
          const created = await onCreate({ multiSelect, options: filled, question: question.trim() });
          if (created) {
            reset();
            onClose();
          }
        } finally {
          setPending(false);
        }
      }}
      open={open}
      submitDisabled={!ready}
      submitLabel="Create poll"
      testId={testIds.createPollDialog}
      title="Ask the group"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="poll-question">Question</Label>
        <Input id="poll-question" maxLength={200} onChange={(event) => setQuestion(event.target.value)} value={question} />
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium">Options</legend>
        {options.map((option, index) => (
          <div className="flex items-center gap-1.5" key={index}>
            <Input
              aria-label={`Option ${index + 1}`}
              maxLength={80}
              onChange={(event) => setOptions(options.map((value, at) => (at === index ? event.target.value : value)))}
              value={option}
            />
            {options.length > MIN_OPTIONS ? (
              <Button aria-label={`Remove option ${index + 1}`} onClick={() => setOptions(options.filter((_, at) => at !== index))} size="icon" type="button" variant="ghost">
                <X aria-hidden />
              </Button>
            ) : null}
          </div>
        ))}
        <Button
          className="self-start"
          data-testid={testIds.createPollAddOption}
          disabled={options.length >= MAX_OPTIONS}
          onClick={() => setOptions([...options, ''])}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Plus aria-hidden />
          Add option
        </Button>
      </fieldset>
      <div className="flex items-center gap-2">
        <Switch checked={multiSelect} id="poll-multi" onCheckedChange={setMultiSelect} />
        <Label htmlFor="poll-multi">Allow several choices</Label>
      </div>
    </FormDialog>
  );
}
```

(Use the index as the key only because rows have no identity besides position and are never reordered.)

- [ ] **Step 7: `trip-polls-panel.tsx`.**

```tsx
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { Skeleton } from '@groam/ui/components/skeleton';
import { Vote } from 'lucide-react';
import { useState } from 'react';
import { usePollActions, useTripPolls } from '@/features/polls/hooks/use-polls';
import { CreatePollDialog } from '@/features/polls/create-poll/create-poll-dialog';
import { PollCard } from '@/features/polls/poll-card/poll-card';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';

/** The trip's Polls tab: open and closed polls, newest first. */
export function TripPollsPanel({ trip }: { trip: TripDetail }) {
  const { isLoading, polls } = useTripPolls(trip.id);
  const actions = usePollActions();
  const [creating, setCreating] = useState(false);
  const writable = trip.archivedAt === null;
  const createButton = writable ? (
    <Button data-testid={testIds.tripPollsCreate} onClick={() => setCreating(true)} size="sm">
      New poll
    </Button>
  ) : null;
  return (
    <section aria-label="Polls" className="flex flex-col gap-3" data-testid={testIds.tripPollsPanel}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Polls</h2>
        {polls.length > 0 ? createButton : null}
      </div>
      {isLoading ? (
        <div aria-label="Loading polls…" className="flex flex-col gap-2" role="status">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : polls.length === 0 ? (
        <EmptyScreen buttonRaw={createButton} description="Ask the group to decide something together." headline="No polls yet" icon={Vote} />
      ) : (
        polls.map((poll) => (
          <PollCard
            key={poll.id}
            onClose={() => actions.close(poll.id)}
            onRetract={() => actions.retract(poll.id)}
            onVote={(optionIds) => actions.vote(poll.id, optionIds)}
            poll={poll}
          />
        ))
      )}
      <CreatePollDialog
        onClose={() => setCreating(false)}
        onCreate={(draft) => actions.create({ ...draft, tripId: trip.id })}
        open={creating}
      />
    </section>
  );
}
```

- [ ] **Step 8: Chat cards and composer action.** `discussion-thread-with-polls.tsx`:

```tsx
import type { Id } from '@groam/backend/data-model';
import { useState } from 'react';
import { usePollActions, useDiscussionPolls } from '@/features/polls/hooks/use-polls';
import { CreatePollDialog } from '@/features/polls/create-poll/create-poll-dialog';
import { PollCard } from '@/features/polls/poll-card/poll-card';
import { DiscussionThreadBody } from './discussion-thread-body';

/** The thread with its linked polls placed by time and a "/poll" composer action. */
export function DiscussionThreadWithPolls({ discussionId, threadId }: { discussionId: Id<'discussions'>; threadId: null | string }) {
  const { polls } = useDiscussionPolls(discussionId);
  const actions = usePollActions();
  const [creating, setCreating] = useState(false);
  const events = polls.map((poll) => ({
    content: (
      <PollCard
        onClose={() => actions.close(poll.id)}
        onRetract={() => actions.retract(poll.id)}
        onVote={(optionIds) => actions.vote(poll.id, optionIds)}
        poll={poll}
      />
    ),
    createdAt: poll.createdAt,
    key: `poll:${poll.id}`
  }));
  return (
    <>
      <DiscussionThreadBody
        commands={[{ description: 'Create a poll for this chat', name: 'poll', run: () => setCreating(true) }]}
        discussionId={discussionId}
        events={events}
        threadId={threadId}
      />
      <CreatePollDialog
        onClose={() => setCreating(false)}
        onCreate={(draft) => actions.create({ ...draft, discussionId })}
        open={creating}
      />
    </>
  );
}
```

`discussion-thread-view.tsx`: replace `<DiscussionThreadBody discussionId={discussionId} threadId={discussion.threadId} />` with `<DiscussionThreadWithPolls discussionId={discussionId} threadId={discussion.threadId} />`. The view still registers agent context; add `pollCount` is not needed (polls reach the agent through the `list` route only when asked).

- [ ] **Step 9: Trip section.**
  - `trip-sections.ts`: add `'polls'` after `'ideas'` in both `tripSections` and `tripTabSections`; `tripSectionLabels.polls = 'Polls'`. Update `trip-sections.test.ts` expectations accordingly.
  - `active-trip-section.tsx`: `if (section === 'polls') return <TripPollsPanel trip={trip} />;` beside the issues branch (import from `@/features/polls/trip-polls/trip-polls-panel`).
  - `trip-section-nav.tsx`: `polls: testIds.tripSectionPolls`.
  - `use-trip-agent-context.ts`: `agentContextNeeds` adds `polls: shared && view === 'polls'`; load `const { polls } = useTripPolls(needs.polls && trip ? trip.id : undefined);`; extras type gains `polls?: Array<{ eligibleCount: number; id: string; question: string; status: string; votedCount: number }>`; `sectionContext.polls = { capabilities: ['trip.status.read', 'poll.create'], data: { ...base, polls: extras.polls ?? [] }, description: 'The trip’s polls: questions the group is deciding. Help word a poll, read results, or suggest what to ask next.' }`; `assistantSection` returns `'overview'` for `'board' | 'research' | 'polls'`.
  - `tooling/app-actions/src/vitest/open-trips.ts` and `playwright/open-trip-section.ts`: add `polls: ids.tripSectionPolls`; `sectionPages.polls = ids.tripPollsPanel` in `open-trips.ts`.
- [ ] **Step 10: Run, expect pass.**

```bash
cd /workspaces/groam/apps/web && vp test run --project views src/features/polls src/features/discussions src/features/trips
cd /workspaces/groam/apps/web && vp test run --project unit src/features/trips/trip-sections.test.ts src/features/assistant
```

Expected: PASS, including `agent-context-coverage.test.ts` and `loading-state-coverage.test.ts` (the polls section renders inside the existing trip route).

---

### Task 3.6: Journey — decide with a trip poll

**Files:**
- Create: `tooling/app-actions/src/vitest/polls.ts` (export from `tooling/app-actions/src/vitest/index.ts`)
- Create: `apps/web/e2e/polls/decide-with-a-trip-poll.test.tsx`

**Interfaces:**
- Produces: `createTripPoll({ options, question }): Promise<void>`, `voteInPoll(question, option): Promise<void>`, `expectPollProgress(question, text): Promise<void>`, `closePoll(question): Promise<void>`.

- [ ] **Step 1: Helpers.**

```ts
// tooling/app-actions/src/vitest/polls.ts
import { expect } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { by } from './locators';
import { tap } from './queries';

const pollCard = (question: string) => page.getByRole('article', { name: `Poll: ${question}` });

export async function createTripPoll({ options, question }: { options: string[]; question: string }): Promise<void> {
  await tap(by(ids.tripPollsCreate));
  const dialog = by(ids.createPollDialog);
  await userEvent.fill(dialog.getByLabelText('Question'), question);
  for (const [index, option] of options.entries()) {
    if (index >= 2) await tap(by(ids.createPollAddOption));
    await userEvent.fill(dialog.getByLabelText(`Option ${index + 1}`), option);
  }
  await tap(dialog.getByRole('button', { name: 'Create poll' }));
  await expect.element(pollCard(question)).toBeVisible();
}

export async function voteInPoll(question: string, option: string): Promise<void> {
  await tap(pollCard(question).getByRole('radio', { name: new RegExp(option, 'u') }));
  await expect.element(pollCard(question).getByRole('radio', { name: new RegExp(option, 'u') })).toBeChecked();
}

export async function expectPollProgress(question: string, text: string): Promise<void> {
  await expect.element(pollCard(question).getByText(text, { exact: false })).toBeVisible();
}

export async function closePoll(question: string): Promise<void> {
  await tap(pollCard(question).getByTestId(ids.pollClose));
  await expect.element(pollCard(question).getByText('Closed')).toBeVisible();
}
```

- [ ] **Step 2: Journey.**

```tsx
import {
  arrange,
  closePoll,
  createTripPoll,
  expectPollProgress,
  openTrip,
  openTripSection,
  uniqueSuffix,
  voteInPoll
} from '@groam/app-actions/vitest';
import { test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('the group decides with a trip poll', async () => {
  const suffix = uniqueSuffix();
  const question = `Dinner Friday ${suffix}`;
  await arrange.account();
  await openApp();
  await openTrip(await arrange.createTrip({ name: `Poll trip ${suffix}` }));
  await openTripSection('polls');
  await createTripPoll({ options: ['Sushi', 'Tapas', 'Pizza'], question });
  await expectPollProgress(question, '0 of 1 voted');
  await voteInPoll(question, 'Tapas');
  await expectPollProgress(question, '1 of 1 voted');
  await closePoll(question);
});
```

- [ ] **Step 3: Run.** With the backend running (`just dev` in another shell, owned by one agent only):
`cd /workspaces/groam && just journeys -- e2e/polls/decide-with-a-trip-poll.test.tsx`
Expected: PASS.

---

### Chunk 3 verification

- [ ] Run:

```bash
cd /workspaces/groam && just codegen
cd /workspaces/groam/packages/ai && vp test run
cd /workspaces/groam/packages/backend && vp run typecheck && vp test run
cd /workspaces/groam/apps/web && vp run typecheck && vp test run --project unit --project views
cd /workspaces/groam && vp run lint && vp check
cd /workspaces/groam && just journeys -- e2e/polls
```

- [ ] Acceptance evidence:
  - `poll-waits.test.ts` passes all six tests (Review Focus 2, 4, 5 plus rule edge cases); `tally.test.ts` covers zero eligible, departed voters, multi-select majority.
  - `polls.test.ts` shows outsider denied read and vote, non-creator denied close, admin allowed, closed poll refuses votes, `closesAt` closes.
  - `poll-agent.test.ts`: the agent's poll is attached to the chat and its trip, the run waits, two votes resume it, the report is the follow-up text, the outcome summary matches the spec format.
  - Every write in `polls/writes.ts` that changes votes or status ends in `AgentWaits.signal({ kind: 'poll', refId })`.
  - Every new `.tsx` in `apps/web/src/features/polls` exports one component and is under 300 lines; colors are semantic tokens only (`rg -n "#[0-9a-fA-F]{3,6}|rgb\(" apps/web/src/features/polls` is empty).
  - `workflow.ts` hash unchanged.
  - Manual (`just dev`, demo login): trip → Polls tab → create, vote as `demo@` and `traveler.001@`, tallies update live in both sessions; in a group chat `/poll` opens the dialog and the card appears inline.

---

## Chunk 4: `issue`, `proposal`, `rsvp` wait kinds

### Task 4.1: Conditions and schema variants

**Files:**
- Modify: `packages/backend/convex/modules/assistant/waits/schema.ts`
- Create: `packages/backend/convex/modules/assistant/waits/conditions/issue.ts`
- Create: `packages/backend/convex/modules/assistant/waits/conditions/proposal.ts`
- Create: `packages/backend/convex/modules/assistant/waits/conditions/rsvp.ts`
- Modify: `packages/backend/convex/modules/assistant/waits/conditions/index.ts`
- Modify: `packages/backend/testing/polls.ts` (generic `waitRun`)

**Interfaces:**
- Produces conditions: `{ kind: 'issue'; issueId: Id<'tripIssues'>; until: 'resolved' }`, `{ kind: 'proposal'; proposalId: Id<'tripProposals'>; until: 'approved' | 'decided' }`, `{ kind: 'rsvp'; rule: 'allResponded' | { going: number }; tripId: Id<'trips'> }`; refIds `issueId`, `proposalId`, `tripId`.
- Produces snapshots: `{ kind: 'issue'; issueId; status; title }`, `{ approvals: number; kind: 'proposal'; proposalId; required: number; status; title }`, `{ going: number; invited: number; kind: 'rsvp'; maybe: number; notGoing: number; tripId }`.
- Produces `#testing/polls` `waitRun(trip, condition: WaitCondition, deadlineAt?)` → `{ runId; wait(): Promise<Doc<'agentWaits'> | null>; waitId }`; `pollWaitRun` delegates to it.

- [ ] **Step 1: Schema variants.**

```ts
const issueCondition = v.object({ issueId: v.id('tripIssues'), kind: v.literal('issue'), until: v.literal('resolved') });
const proposalCondition = v.object({
  kind: v.literal('proposal'),
  proposalId: v.id('tripProposals'),
  until: v.union(v.literal('approved'), v.literal('decided'))
});
const rsvpCondition = v.object({
  kind: v.literal('rsvp'),
  rule: v.union(v.literal('allResponded'), v.object({ going: v.number() })),
  tripId: v.id('trips')
});
const condition = v.union(timerCondition, pollCondition, issueCondition, proposalCondition, rsvpCondition);
const kind = v.union(v.literal('timer'), v.literal('poll'), v.literal('issue'), v.literal('proposal'), v.literal('rsvp'));

const issueSnapshot = v.object({ issueId: v.id('tripIssues'), kind: v.literal('issue'), status: v.string(), title: v.string() });
const proposalSnapshot = v.object({
  approvals: v.number(),
  kind: v.literal('proposal'),
  proposalId: v.id('tripProposals'),
  required: v.number(),
  status: v.string(),
  title: v.string()
});
const rsvpSnapshot = v.object({
  going: v.number(),
  invited: v.number(),
  kind: v.literal('rsvp'),
  maybe: v.number(),
  notGoing: v.number(),
  tripId: v.id('trips')
});
const snapshot = v.union(timerSnapshot, pollSnapshot, issueSnapshot, proposalSnapshot, rsvpSnapshot);
```

- [ ] **Step 2: Conditions.**

```ts
// conditions/issue.ts
import { ConvexError } from 'convex/values';
import { defineWaitCondition } from '#convex/modules/assistant/waits/conditions/types';
import { isResolved } from '#convex/modules/travel/issues/status';

export const issueCondition = defineWaitCondition({
  evaluate: async (ctx, condition) => {
    const issue = await ctx.db.get('tripIssues', condition.issueId);
    if (!issue) {
      return { met: false, progress: null, snapshot: { issueId: condition.issueId, kind: 'issue', status: 'deleted', title: 'Deleted issue' }, summary: 'The issue was deleted' };
    }
    const met = isResolved(issue.status);
    return {
      met,
      progress: met ? 'resolved' : issue.status.replace('_', ' '),
      snapshot: { issueId: issue._id, kind: 'issue', status: issue.status, title: issue.title },
      summary: `issue '${issue.title}' is ${issue.status.replace('_', ' ')}`
    };
  },
  kind: 'issue',
  label: async (ctx, condition) => {
    const issue = await ctx.db.get('tripIssues', condition.issueId);
    return issue ? `issue “${issue.title}” to be resolved` : 'a deleted issue';
  },
  refId: (condition) => condition.issueId,
  validate: async (ctx, condition, scope) => {
    const issue = await ctx.db.get('tripIssues', condition.issueId);
    if (!issue || issue.organizationId !== scope.organizationId) throw new ConvexError('Issue not found');
    if (scope.tripId && issue.tripId !== scope.tripId) throw new ConvexError('That issue belongs to another trip');
    return { tripId: issue.tripId };
  }
});
```

```ts
// conditions/proposal.ts
import { ConvexError } from 'convex/values';
import type { Doc } from '#convex-generated/dataModel';
import { defineWaitCondition, type WaitReadCtx } from '#convex/modules/assistant/waits/conditions/types';

const MAX_APPROVALS = 200;

async function approvalCount(ctx: WaitReadCtx, proposal: Doc<'tripProposals'>): Promise<number> {
  const approvals = await ctx.db
    .query('tripProposalApprovals')
    .withIndex('by_proposalId', (query) => query.eq('proposalId', proposal._id))
    .take(MAX_APPROVALS);
  return approvals.length;
}

export const proposalCondition = defineWaitCondition({
  evaluate: async (ctx, condition) => {
    const proposal = await ctx.db.get('tripProposals', condition.proposalId);
    if (!proposal) {
      return {
        met: false,
        progress: null,
        snapshot: { approvals: 0, kind: 'proposal', proposalId: condition.proposalId, required: 0, status: 'deleted', title: 'Deleted idea' },
        summary: 'The idea was deleted'
      };
    }
    const approvals = await approvalCount(ctx, proposal);
    const decided = proposal.status === 'merged' || proposal.status === 'closed';
    const approved = proposal.status === 'merged' || approvals >= proposal.requiredApprovals;
    const met = condition.until === 'decided' ? decided : approved;
    return {
      met,
      progress: `${approvals} of ${proposal.requiredApprovals} approvals`,
      snapshot: {
        approvals,
        kind: 'proposal',
        proposalId: proposal._id,
        required: proposal.requiredApprovals,
        status: proposal.status,
        title: proposal.title
      },
      summary: `idea '${proposal.title}' is ${proposal.status.replace('_', ' ')} with ${approvals} of ${proposal.requiredApprovals} approvals`
    };
  },
  kind: 'proposal',
  label: async (ctx, condition) => {
    const proposal = await ctx.db.get('tripProposals', condition.proposalId);
    if (!proposal) return 'a deleted idea';
    return condition.until === 'approved' ? `idea “${proposal.title}” to be approved` : `a decision on idea “${proposal.title}”`;
  },
  refId: (condition) => condition.proposalId,
  validate: async (ctx, condition, scope) => {
    const proposal = await ctx.db.get('tripProposals', condition.proposalId);
    if (!proposal || proposal.organizationId !== scope.organizationId) throw new ConvexError('Idea not found');
    if (scope.tripId && proposal.sourceTripId !== scope.tripId && proposal.workingTripId !== scope.tripId) {
      throw new ConvexError('That idea belongs to another trip');
    }
    return { tripId: proposal.sourceTripId };
  }
});
```

```ts
// conditions/rsvp.ts
import { ConvexError } from 'convex/values';
import { defineWaitCondition } from '#convex/modules/assistant/waits/conditions/types';
import { statusesForTrip } from '#convex/modules/travel/travelers/statuses';

const MAX_ROWS = 200;

export const rsvpCondition = defineWaitCondition({
  evaluate: async (ctx, condition) => {
    const trip = await ctx.db.get('trips', condition.tripId);
    const empty = { going: 0, invited: 0, kind: 'rsvp' as const, maybe: 0, notGoing: 0, tripId: condition.tripId };
    if (!trip) return { met: false, progress: null, snapshot: empty, summary: 'The trip was deleted' };
    const [members, rows] = await Promise.all([
      statusesForTrip(ctx, trip._id, trip.organizationId),
      ctx.db.query('tripTravelers').withIndex('by_tripId', (query) => query.eq('tripId', trip._id)).take(MAX_ROWS)
    ]);
    const count = (status: string) => members.filter((member) => member.status === status).length;
    const snapshot = {
      going: count('going'),
      invited: rows.filter((row) => row.status === 'invited').length,
      kind: 'rsvp' as const,
      maybe: count('maybe'),
      notGoing: count('not_going'),
      tripId: trip._id
    };
    const met = condition.rule === 'allResponded' ? snapshot.invited === 0 : snapshot.going >= condition.rule.going;
    return {
      met,
      progress: `${snapshot.going} going, ${snapshot.invited} not answered`,
      snapshot,
      summary: `RSVPs for '${trip.name}' — ${snapshot.going} going, ${snapshot.maybe} maybe, ${snapshot.notGoing} not going, ${snapshot.invited} not answered`
    };
  },
  kind: 'rsvp',
  label: async (ctx, condition) => {
    const trip = await ctx.db.get('trips', condition.tripId);
    const target = condition.rule === 'allResponded' ? 'everyone to RSVP' : `${condition.rule.going} people going`;
    return trip ? `${target} for “${trip.name}”` : 'RSVPs on a deleted trip';
  },
  refId: (condition) => condition.tripId,
  validate: async (ctx, condition, scope) => {
    const trip = await ctx.db.get('trips', condition.tripId);
    if (!trip || trip.organizationId !== scope.organizationId) throw new ConvexError('Trip not found');
    if (scope.tripId && scope.tripId !== trip._id) throw new ConvexError('That trip is not this run’s trip');
    if (condition.rule !== 'allResponded' && !(Number.isInteger(condition.rule.going) && condition.rule.going >= 1)) {
      throw new ConvexError('A going count must be a whole number of at least 1');
    }
    return { tripId: trip._id };
  }
});
```

Register all three in `conditions/index.ts` (`issue: issueCondition, proposal: proposalCondition, rsvp: rsvpCondition`); the `satisfies` clause fails typecheck until every kind is present.

- [ ] **Step 3: Generic test helper.** In `testing/polls.ts` extract the body of `pollWaitRun` into:

```ts
export async function waitRun(
  trip: Awaited<ReturnType<typeof setupTrip>>,
  condition: WaitCondition,
  deadlineAt = Date.now() + 24 * HOUR
) { /* same body as pollWaitRun, passing `condition` to AgentWaits.create */ }

export async function pollWaitRun(trip: Awaited<ReturnType<typeof setupTrip>>, pollId: Id<'polls'>, rule: PollRule[], deadlineAt?: number) {
  return await waitRun(trip, { kind: 'poll', pollId, rule }, deadlineAt);
}
```

(`import type { WaitCondition } from '#convex/modules/assistant/waits/schema';`)

- [ ] **Step 4: Codegen + typecheck.** `cd /workspaces/groam && just codegen && cd packages/backend && vp run typecheck` → PASS.

---

### Task 4.2: Domain writes signal their waits

**Files:**
- Modify: `packages/backend/convex/modules/travel/issues/lifecycle.ts:71-127` (`move`, `closeAfterMerge`)
- Modify: `packages/backend/convex/modules/travel/issues/sync.ts:39-75` (`syncTripConditions`)
- Modify: `packages/backend/convex/modules/travel/trips/index.ts:101-123` (`deleteIssueBatch`), and the proposal deletion in `deleteProposalBatch`
- Modify: `packages/backend/convex/modules/travel/versions/index.ts` (`setApproval` ~1098, `finishMerge` ~1218, `close` ~1610)
- Modify: `packages/backend/convex/modules/travel/travelers/index.ts` (`setTravelerStatus`, `claimInvitation`)
- Create: `packages/backend/convex/modules/assistant/waits/domain-waits.test.ts`

**Interfaces:**
- Consumes: `AgentWaits.signal(ctx, { deleted?, kind, refId })`.

- [ ] **Step 1: Failing tests.** `waits/domain-waits.test.ts`:

```ts
import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { waitRun } from '#testing/polls';
import { setupTrip } from '#testing/trips';
import { draftChangedVersion } from '#testing/versions';

test('closing an issue meets its resolved wait; other issues stay waiting', async () => {
  const trip = await setupTrip(0);
  const create = (title: string) => trip.owner.client.mutation(api.routes.trips.issues.create.run, { body: 'b', title, tripId: trip.tripId });
  const watched = await create('Visas');
  const other = await create('Insurance');
  const a = await waitRun(trip, { issueId: watched, kind: 'issue', until: 'resolved' });
  const b = await waitRun(trip, { issueId: other, kind: 'issue', until: 'resolved' });
  await trip.owner.client.mutation(api.routes.trips.issues.status.run, { issueId: watched, status: 'in_progress' });
  expect((await a.wait())?.status).toBe('waiting');
  await trip.owner.client.mutation(api.routes.trips.issues.status.run, { issueId: watched, status: 'closed' });
  expect(await a.wait()).toMatchObject({ outcome: { reason: 'met', summary: "issue 'Visas' is closed" }, status: 'met' });
  expect((await b.wait())?.status).toBe('waiting');
});

test('an approval meets an approved wait; closing an idea meets a decided wait', async () => {
  const trip = await setupTrip(1);
  const [reviewer] = trip.users;
  if (!reviewer) throw new Error('Expected a reviewer');
  const version = await draftChangedVersion(trip.owner, trip.tripId);
  await trip.owner.client.action(api.routes.trips.versions.submit.run, { proposalId: version.proposalId });
  const approved = await waitRun(trip, { kind: 'proposal', proposalId: version.proposalId, until: 'approved' });
  const decided = await waitRun(trip, { kind: 'proposal', proposalId: version.proposalId, until: 'decided' });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, { approved: true, proposalId: version.proposalId });
  expect((await approved.wait())?.status).toBe('met');
  expect((await decided.wait())?.status).toBe('waiting');
  await trip.owner.client.mutation(api.routes.trips.versions.close.run, { proposalId: version.proposalId, reason: 'Not now' });
  expect((await decided.wait())?.status).toBe('met');
});

test('RSVP waits: a going count is met by RSVPs; allResponded waits for invitations', async () => {
  const trip = await setupTrip(2);
  const [first, second] = trip.users;
  if (!first || !second) throw new Error('Expected members');
  await trip.owner.test.run((ctx) =>
    ctx.db.insert('tripTravelers', {
      email: 'friend@example.com',
      invitationId: 'invite-rsvp',
      name: 'Friend',
      organizationId: trip.owner.organizationId as string,
      status: 'invited',
      tripId: trip.tripId,
      updatedAt: Date.now()
    })
  );
  await first.client.mutation(api.routes.trips.travelers.set.run, { status: 'maybe', tripId: trip.tripId });
  const going = await waitRun(trip, { kind: 'rsvp', rule: { going: 3 }, tripId: trip.tripId });
  const answered = await waitRun(trip, { kind: 'rsvp', rule: 'allResponded', tripId: trip.tripId });
  expect((await going.wait())?.status).toBe('waiting');
  await first.client.mutation(api.routes.trips.travelers.set.run, { status: 'going', tripId: trip.tripId });
  expect((await going.wait())?.status).toBe('met');
  expect((await answered.wait())?.status).toBe('waiting');
  await trip.owner.test.run(async (ctx) => {
    const { TripTravelers } = await import('#convex/modules/travel/travelers/index');
    await TripTravelers.claimInvitation(ctx, 'invite-rsvp', {
      organizationId: trip.owner.organizationId as string,
      userId: second.userId,
      viewerName: 'Second'
    });
  });
  expect((await answered.wait())?.status).toBe('met');
});

test('deleting a trip cancels waits on its issues', async () => {
  const trip = await setupTrip(0);
  const issueId = await trip.owner.client.mutation(api.routes.trips.issues.create.run, { body: 'b', title: 'Gone', tripId: trip.tripId });
  const run = await waitRun(trip, { issueId, kind: 'issue', until: 'resolved' });
  await trip.owner.test.run(async (ctx) => {
    const { AgentWaits } = await import('#convex/modules/assistant/waits/index');
    await ctx.db.delete('tripIssues', issueId);
    await AgentWaits.signal(ctx, { deleted: true, kind: 'issue', refId: issueId });
  });
  expect(await run.wait()).toMatchObject({ outcome: { reason: 'cancelled', summary: 'Cancelled: the watched issue was deleted' }, status: 'cancelled' });
});
```

(Claiming through the facade mirrors `routes/trips/travelers/claim.ts`, which needs an invitation code flow the test factory does not model; the route calls the same helper. The last test pins `signal({ deleted: true })` semantics; Step 3 wires the real cascade, exercised by `modules/travel/trips` deletion tests.)

- [ ] **Step 2: Run, expect fail.** `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant/waits/domain-waits.test.ts` → FAIL (waits never resolve).
- [ ] **Step 3: Wire signals.** Import `AgentWaits` from `#convex/modules/assistant/waits/index` in each file and add, in the same transaction as the write:
  - `issues/lifecycle.ts` `move`: after the status patch (inside the "status changed" path, after `appendSystemComment`) → `await AgentWaits.signal(ctx, { kind: 'issue', refId: issueId });`.
  - `issues/lifecycle.ts` `closeAfterMerge`: after `appendSystemComment` → `await AgentWaits.signal(ctx, { kind: 'issue', refId: issue._id });`.
  - `issues/sync.ts` `syncTripConditions`: inside the `moves.map(async …)` callback after `appendSystemComment` → `await AgentWaits.signal(ctx, { kind: 'issue', refId: issue._id });`.
  - `trips/index.ts` `deleteIssueBatch`: before `ctx.db.delete('tripIssues', issue._id)` → `await AgentWaits.signal(ctx, { deleted: true, kind: 'issue', refId: issue._id });`; `deleteProposalBatch`: before `ctx.db.delete('tripProposals', proposalId)` → `await AgentWaits.signal(ctx, { deleted: true, kind: 'proposal', refId: proposalId });`. Add a matching poll cascade: a `deletePollBatch(ctx, tripId)` that deletes `pollVotes` (by `by_pollId_and_userId` prefix, `DELETE_BATCH_SIZE`) then the poll after `AgentWaits.signal(ctx, { deleted: true, kind: 'poll', refId: poll._id })`, called in the trip deletion sequence beside `deleteIssueBatch`; and `AgentWaits.signal(ctx, { deleted: true, kind: 'rsvp', refId: tripId })` once when the trip row itself is deleted.
  - `versions/index.ts` `setApproval`: before `return null` at the end (both insert and delete branches) → `await AgentWaits.signal(ctx, { kind: 'proposal', refId: proposalId });`; `finishMerge`: after the `Promise.all` patch block → same; `close`: after the status patch → same.
  - `travelers/index.ts` `setTravelerStatus`: after `syncTripConditions(ctx)` → `await AgentWaits.signal(ctx, { kind: 'rsvp', refId: ctx.trip._id });`; `claimInvitation`: after the patch → `await AgentWaits.signal(ctx, { kind: 'rsvp', refId: traveler.tripId });`.
- [ ] **Step 4: Run, expect pass.** `cd /workspaces/groam/packages/backend && vp test run convex/modules/assistant/waits convex/modules/travel` → PASS (existing issue, version, traveler, and trip-deletion suites stay green).

---

### Task 4.3: Agents can wait on issues, ideas, and RSVPs

**Files:**
- Modify: `packages/backend/assistant/tools/agent/waits.ts` (three schema variants)
- Modify: `packages/backend/assistant/tools/agent/waits.test.ts`
- Modify: `packages/ai/src/tools/specs.ts` (`'agent.wait.create'` guidance lists the new kinds)

**Interfaces:**
- Produces tool input variants: `{ kind: 'issue'; issueId: string }` (until fixed to `'resolved'`), `{ kind: 'proposal'; proposalId: string; until: 'approved' | 'decided' }`, `{ kind: 'rsvp'; rule: 'allResponded' | { going: number } }` (trip defaults to the active trip).

- [ ] **Step 1: Failing test.** Append to `waits.test.ts`:

```ts
test('waitFor maps issue, idea, and RSVP conditions onto the active trip', async () => {
  const calls: Array<{ condition: unknown }> = [];
  const tool = createWaitForTool('trip-1' as never) as unknown as Executable;
  const ctx = { runMutation: async (_ref: unknown, args: { condition: unknown }) => { calls.push(args); return { eventId: 'e', status: 'waiting', waitId: 'w' }; } };
  await tool.execute(ctx, { condition: { issueId: 'i1', kind: 'issue' }, deadlineHours: 1 });
  await tool.execute(ctx, { condition: { kind: 'proposal', proposalId: 'p1', until: 'decided' }, deadlineHours: 1 });
  await tool.execute(ctx, { condition: { kind: 'rsvp', rule: { going: 4 } }, deadlineHours: 1 });
  expect(calls.map((call) => call.condition)).toEqual([
    { issueId: 'i1', kind: 'issue', until: 'resolved' },
    { kind: 'proposal', proposalId: 'p1', until: 'decided' },
    { kind: 'rsvp', rule: { going: 4 }, tripId: 'trip-1' }
  ]);
});

test('an RSVP wait without an active trip is refused before calling Convex', async () => {
  const tool = createWaitForTool(null) as unknown as Executable;
  await expect(
    tool.execute({ runMutation: async () => { throw new Error('should not run'); } }, { condition: { kind: 'rsvp', rule: 'allResponded' }, deadlineHours: 1 })
  ).rejects.toThrow('Open a trip');
});
```

Update the earlier `createWaitForTool()` calls in this file to `createWaitForTool(null)`.

- [ ] **Step 2: Run, expect fail.** `cd /workspaces/groam/packages/backend && vp test run assistant/tools/agent/waits.test.ts` → FAIL.
- [ ] **Step 3: Implement.** In `waits.ts`:

```ts
export const waitConditionInputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('timer') }).describe('Resume when the deadline passes.'),
  z.object({ kind: z.literal('poll'), pollId: z.string(), rule: z.array(pollRuleInputSchema).min(1) }).describe('Resume when any listed rule holds for an existing poll.'),
  z.object({ issueId: z.string(), kind: z.literal('issue') }).describe('Resume when the trip issue is closed or marked won’t do.'),
  z.object({ kind: z.literal('proposal'), proposalId: z.string(), until: z.enum(['approved', 'decided']) }).describe('Resume when the idea has its required approvals (approved) or is applied or closed (decided).'),
  z.object({ kind: z.literal('rsvp'), rule: z.union([z.literal('allResponded'), z.object({ going: z.number().int().min(1) })]) }).describe('Resume when every invitation is answered, or when enough travelers are going, on the active trip.')
]);

type WaitConditionInput = z.infer<typeof waitConditionInputSchema>;

function toCondition(input: WaitConditionInput, activeTripId: Id<'trips'> | null) {
  switch (input.kind) {
    case 'timer':
      return { kind: 'timer' as const };
    case 'poll':
      return { kind: 'poll' as const, pollId: input.pollId as Id<'polls'>, rule: input.rule };
    case 'issue':
      return { issueId: input.issueId as Id<'tripIssues'>, kind: 'issue' as const, until: 'resolved' as const };
    case 'proposal':
      return { kind: 'proposal' as const, proposalId: input.proposalId as Id<'tripProposals'>, until: input.until };
    case 'rsvp':
      if (!activeTripId) throw new ConvexError('Open a trip before waiting on RSVPs');
      return { kind: 'rsvp' as const, rule: input.rule, tripId: activeTripId };
  }
}
```

`createWaitForTool(activeTripId: Id<'trips'> | null)` passes `condition: toCondition(input.condition, activeTripId)`; the binding becomes `create: ({ activeTripId, actorRunId }) => (actorRunId ? createWaitForTool(activeTripId) : null)`. Import `ConvexError` from `convex/values`. Update the `'agent.wait.create'` guidance: `'… a timer to check back, a poll, a trip issue to be resolved, an idea to be approved or decided, or RSVPs. …'`.

- [ ] **Step 4: Run, expect pass.** Step 2 command plus `cd /workspaces/groam/packages/ai && vp test run src/tools` → PASS.

---

### Chunk 4 verification (final gate)

- [ ] Run:

```bash
cd /workspaces/groam && just codegen
cd /workspaces/groam && just check
cd /workspaces/groam && just journeys -- e2e/polls e2e/issues e2e/chat
```

`just check` runs audit, typecheck, lint (conventions, claude harness, packages, Oxlint/Oxfmt), all package tests, React Doctor, and Fallow; it must pass unmodified. Journeys need the backend running (`just dev`, one owner).

- [ ] Acceptance evidence:
  - `domain-waits.test.ts` passes; each domain write site listed in Task 4.2 Step 3 has exactly one `AgentWaits.signal` call in the same mutation (reviewer greps `rg -n "AgentWaits.signal" packages/backend/convex/modules`).
  - Adding a kind touched exactly: one condition file, the schema variants, the registry line, the tool input variant, and the domain `signal` calls (spec success criterion).
  - `workflow.ts` hash unchanged since Chunk 1; `MAX_TURNS` is 25.
  - Review Focus tests 1–5 all present and passing.
  - Upgrade path (for the `upgrade-reviewer`): schema changes are additive (new tables `agentWaits`, `polls`, `pollVotes`; optional `agentRuns` fields; new status literal `waiting`); after deploy run `CONVEX_AGENT_MODE=anonymous vp exec convex run modules/assistant/engine/migrations:failLegacyRuns` until it returns `more: false`.
