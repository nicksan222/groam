# Agent execution implementation

This file describes how the decisions in [README.md](./README.md) are
implemented: runs, the durable workflow, turns, waits, stopping and cleanup.
The pseudocode is simplified from the source and keeps the real identifiers,
limits and error strings; when they disagree, the source wins.

## Run creation and ownership

A run is an `agentRuns` row. Domain code creates it, then calls
`AgentEngine.start`, which attaches a workflow only when the run is startable.
Issue and review queues return an active run (`queued`, `running` or
`waiting`) for the same issue or idea instead of adding another. Callers
include issue assignment, idea review requests, `retryIssueRun`, the agent
monitor (`startStandalone`) and `DiscussionAssistant.respond`. The last two
apply `aiRateLimiter.limit(ctx, 'tripAssistantMessage', ...)` first.

```ts
queueIssueRun(ctx, args):                        // runs/index.ts; queueReviewRun is alike
  existing = activeIssueRun(ctx, args.issueId)
  if (existing) return existing._id
  return insertWithShortId('agentRuns', { status: 'queued', surface: agent.surface, ... })

claimDiscussionTurn(ctx, args):                  // after Discussions.claimAssistantResponse
  runId = startDiscussionTurn(...)               // oldest queued turn -> 'running', or a new run
  abortActiveRun(other running runs with the same promptMessageId)   // stale re-claim

startable(run) = !run.workflowId &&              // engine/index.ts
  (run.status === 'queued' || (run.status === 'running' && run.surface === 'chat'))
AgentEngine.start(ctx, runId):
  if (!run || !startable(run)) return null       // already owned: no-op
  workflowId = start(ctx, internal...workflow.agentRun, { runId },
                     { context: { runId }, onComplete: internal...functions.onComplete })
  db.patch(runId, { workflowId, updatedAt: now })
```

Source: [runs/index.ts](../../../packages/backend/convex/modules/assistant/runs/index.ts#L207),
[engine/index.ts](../../../packages/backend/convex/modules/assistant/engine/index.ts#L11),
[respond.ts](../../../packages/backend/convex/modules/discussions/assistant/respond.ts#L17).

## The workflow loop

Every run is one `@convex-dev/workflow` workflow on the single `agentWorkflow`
manager. The `agentRun` body only alternates turn steps and event waits; it
never reads the database. Turn steps run with `retry: false`, and the workpool
defaults to `retryActionsByDefault: false`.

```ts
agentWorkflow = new WorkflowManager(components.workflow, {
  workpoolOptions: { logLevel: 'WARN', maxParallelism: 50, retryActionsByDefault: false } })

MAX_TURNS = 25
agentRun({ runId }): RunOutcome                  // FROZEN
  for (turn = 0; turn < MAX_TURNS; turn++)
    result = step.runAction(internal.modules.assistant.engine.turn.run,
                            resume ? { resume, runId } : { runId }, { retry: false })
    if (result.kind !== 'wait') return result    // done | aborted | failed
    resume = step.awaitEvent({ id: result.eventId, validator: waitResumeValidator })
  return { kind: 'exhausted' }
// waitResumeValidator = { reason: 'met' | 'deadline' | 'cancelled', waitId }
```

Source: [engine/workflow.ts](../../../packages/backend/convex/modules/assistant/engine/workflow.ts#L13),
[engine/manager.ts](../../../packages/backend/convex/modules/assistant/engine/manager.ts#L8),
[engine/schema.ts](../../../packages/backend/convex/modules/assistant/engine/schema.ts#L5).

## A turn

`turn.run` is a thin internal action over `AgentTurns.run`. It claims the run,
builds the resume note, runs the chat or standalone session, stores the reply
with `recordReply`, and asks `suspend` whether the turn left an active wait.
Model and tool failures are returned as `failed`, never thrown.

```ts
AgentTurns.run(ctx, { resume, runId }): TurnResult
  claimed = runMutation(functions.claimTurn, { runId })
  if (!claimed) return { kind: 'aborted' }       // complete | failed | aborted
  try
    note = noteFor(ctx, resume)                  // null on a first turn
    result = claimed.surface === 'chat' ? chatTurn(claimed, note) : standaloneTurn(claimed, note)
    if (result.kind !== 'done') return result
    suspended = runMutation(functions.suspend, { runId })
    return suspended ? { kind: 'wait', eventId: suspended.eventId } : result
  catch (error)
    if (isAborted(runId)) return { kind: 'aborted' }
    return { kind: 'failed', error: failTurn(ctx, claimed, error, resume !== undefined) }

claimTurn: patch { status: 'running', headline: 'Working…', turns: (run.turns ?? 0) + 1,
                   ...(resumed ? { activeWaitId: undefined } : {}) }
```

A first chat turn answers the claimed discussion request; a resumed one
prompts with a hidden system message from `AssistantSession.saveResumeNote`.
A missing prompt or screen throws `'Discussion run is missing its prompt'`.
Standalone turns have no thread, so `StandaloneSession.resumedPrompt` appends
the note and `Your report so far: ...` to the task.

Source: [engine/turn.ts](../../../packages/backend/convex/modules/assistant/engine/turn.ts#L11),
[engine/turns.ts](../../../packages/backend/convex/modules/assistant/engine/turns.ts#L121),
[runs/index.ts `claimTurn`](../../../packages/backend/convex/modules/assistant/runs/index.ts#L392).

## The model session and stop conditions

Each turn builds a fresh `Agent` with the registered tools and two stop
conditions: a step cap and `stopAfterWait`, which ends generation on the step
where a tool returned `wait: true`. Chat turns stream into the thread;
standalone turns call `generateText` with `saveMessages: 'none'`. Every step
passes through `AgentRunTracking.recordStep`, which appends ordered
`agentRunEvents` (next `seq`) and throws `'Agent run aborted'` once the run is
aborted.

```ts
// agent/session.ts (private and discussion chats)
stopWhen: [stepCountIs(8), stopAfterWait]
contextOptions: { excludeToolMessages: false, recentMessages: 100 }
MAX_PROMPT_LENGTH = 5_000      // `Messages must contain 1 to ${MAX_PROMPT_LENGTH} characters`

// standalone/session.ts (issue and review workers)
stopWhen: [stepCountIs(12), stopAfterWait]
contextOptions: { excludeToolMessages: true, recentMessages: 0 }
callSettings: { maxOutputTokens }   // MAX_ISSUE_OUTPUT_TOKENS = MAX_REVIEW_OUTPUT_TOKENS = 2_048

// tools/agent/stop.ts
endedInWait(steps) = steps.at(-1)?.toolResults.some(r => r.output?.wait === true) ?? false
stopAfterWait = ({ steps }) => endedInWait(steps)
```

Source: [agent/session.ts](../../../packages/backend/convex/modules/assistant/agent/session.ts#L111),
[standalone/session.ts](../../../packages/backend/convex/modules/assistant/standalone/session.ts#L58),
[stop.ts](../../../packages/backend/assistant/tools/agent/stop.ts#L6),
[runs/tracking.ts](../../../packages/backend/convex/modules/assistant/runs/tracking.ts#L45).

## Durable waits: create and suspend

The `waitFor` tool (`deadlineHours` from 0.05 to 336) calls `createForRun`,
which requires a run actor. `AgentWaits.create` validates the run and the
condition, creates the workflow event, schedules expiry and resolves at once if
the condition already holds. After the session, `suspend` marks the run
`waiting` with the headline `Waiting for <label>`, answers the chat request,
clears `promptMessageId` and hands the `eventId` to the workflow.

```ts
MAX_WAIT_MS = 14 * 24 * 60 * 60 * 1000
AgentWaits.create(ctx, { condition, deadlineAt, runId }):
  if (run?.status !== 'running' || !run.workflowId) throw 'Only a running agent run can wait'
  if ((run.turns ?? 0) >= MAX_TURNS) throw 'This run has no turns left to resume after a wait; finish now'
  if (activeWait?.status === 'waiting') throw 'This run is already waiting'
  if (!isFinite(deadlineAt) || deadlineAt <= now) throw 'A wait needs a deadline in the future'
  if (deadlineAt - now > MAX_WAIT_MS) throw 'A wait deadline can be at most 14 days away'
  { tripId } = validateCondition(ctx, condition, { discussionId, organizationId, tripId,
                                                   viewer: runCreator(ctx, run) })
  eventId = createEvent(ctx, components.workflow, { name: `wait:${condition.kind}`, workflowId })
  waitId = db.insert('agentWaits', { condition, deadlineAt, eventId, refId, status: 'waiting', ... })
  db.patch(runId, { activeWaitId: waitId })
  scheduler.runAt(deadlineAt, internal...waits.functions.expire, { waitId })
  if (evaluateCondition(ctx, condition).met) resolve(ctx, waitId, { reason: 'met', ... })
```

Source: [waits/index.ts `create`](../../../packages/backend/convex/modules/assistant/waits/index.ts#L134),
[waits/functions.ts](../../../packages/backend/convex/modules/assistant/waits/functions.ts#L34),
[tools/agent/waits.ts](../../../packages/backend/assistant/tools/agent/waits.ts#L102),
[engine/functions.ts `suspend`](../../../packages/backend/convex/modules/assistant/engine/functions.ts#L62).

## Durable waits: signal, resolve and resume

Domain writes call `AgentWaits.signal({ kind, refId })` (polls, issues, ideas,
RSVPs, membership), or pass `deleted: true` when the entity is removed. A
signal reads waits by `by_kind_and_refId_and_status` in batches of
`SIGNAL_BATCH = 50` and loads the entity once per batch. Signals, expiry and
cancellation all go through one `resolve`. Its status check makes it
idempotent, and OCC serializes concurrent resolvers.

```ts
resolve(ctx, waitId, { evaluation, notify = true, reason }):
  if (wait?.status !== 'waiting') return false
  db.patch(waitId, { outcome: { progress, reason, snapshot, summary: summary.slice(0, 500) },
                     status: { met: 'met', deadline: 'expired', cancelled: 'cancelled' }[reason] })
  if (!notify) return true
  try sendEvent(ctx, components.workflow, { id: wait.eventId, value: { reason, waitId } })
  catch failUndelivered(...)   // run 'failed': 'The run could not resume after its wait. Try again.'
signal(...): full page -> scheduler.runAfter(0, waits.functions.signal, { after: last._creationTime })
             deleted ? resolve('cancelled', `Cancelled: the watched ${kind} was deleted`)
                     : evaluation.met && resolve('met')
expire(waitId): resolve(waitId, { evaluation: evaluateCondition(...), reason: 'deadline' })
```

`sendEvent` to a finished workflow does not restart it. On resume, `noteFor`
reads `resumeContext` and builds `Wait met: <summary>. Continue the task with
this outcome.` (likewise `Wait expired`, `Wait cancelled`), or `Wait met: timer
elapsed. Continue the task.` for a timer.

Source: [waits/index.ts `resolve`](../../../packages/backend/convex/modules/assistant/waits/index.ts#L79),
[waits/index.ts `signal`](../../../packages/backend/convex/modules/assistant/waits/index.ts#L210),
[engine/schema.ts `resumeNote`](../../../packages/backend/convex/modules/assistant/engine/schema.ts#L39).

## Stop, abort and terminal guards

`AgentRuns.finish` is the guarded terminal write: it does nothing once the run
is `complete`, `failed` or `aborted`. A stop writes `aborted` first and then
cancels. A stop closes the wait with `notify: false`, so the run does not
resume. A user cancelling only the wait uses `notify: true`, and the run
resumes with `cancelled`. `onComplete` writes the workflow's outcome.

```ts
AgentRuns.stopRun(ctx, runId):     // assertCanControl: 'Only the trip creator or a group admin can stop this run'
  finish(ctx, { runId, status: 'aborted' }); AgentEngine.cancel(ctx, run)
AgentEngine.cancel(ctx, run):
  if (run.activeWaitId) AgentWaits.cancel(ctx, { notify: false, reason: 'the run was stopped', waitId })
  if (getStatus(workflowId).type === 'inProgress') cancel(ctx, components.workflow, workflowId)
routes/agents/waits/cancel: AgentWaits.cancel(ctx, { notify: true, reason: `${viewerName} cancelled the wait` })

onComplete({ context: { runId }, result }):
  { error, status } = terminalOf(outcomeOf(result))   // canceled -> aborted
    // workflow failure -> RUN_STALLED_ERROR; exhausted -> 'The run reached its turn limit.'
  if (run.activeWaitId) AgentWaits.cancel(ctx, { notify: false, reason: 'the run ended', waitId })
  finishDiscussionTurn(...)                           // skipped if superseded by a newer run
  AgentRuns.finish(ctx, { runId, status, error?, report? })
```

An in-flight turn may still return after a stop. Its writes stop at the next
boundary. `recordStep` throws, the turn checks `isAborted` before recording a
reply, and tool calls fail with `'Agent run is not active'` because
`loadRunActor` only accepts `running` runs.

Source: [runs/index.ts `finish`](../../../packages/backend/convex/modules/assistant/runs/index.ts#L431),
[runs/index.ts `stopRun`](../../../packages/backend/convex/modules/assistant/runs/index.ts#L576),
[engine/functions.ts `onComplete`](../../../packages/backend/convex/modules/assistant/engine/functions.ts#L168),
[auth/workspace.ts](../../../packages/backend/convex/modules/auth/workspace.ts#L232).

## Stale cleanup and inline runs

A cron fails runs that no workflow owns. The index includes `workflowId`, so
`waiting` and workflow-owned runs are never swept. Manual idea reviews run
inline in the calling action. `claimInline` takes only a `queued` run without a
workflow, so it cannot run a turn that a workflow owns.

```ts
crons.interval('fail stale agent runs', { minutes: 5 }, runs.functions.sweepStaleRuns)
STALE_RUN_MS = 15 * 60 * 1000; STALE_QUEUED_MS = 10 * 60 * 1000; STALE_RUN_BATCH = 100
failStaleRuns: by_status_and_workflowId_and_updatedAt(status, workflowId = undefined, idle)
  -> { status: 'failed', error: 'The run stopped responding. Try again.' }

AgentTurns.runInline(ctx, runId):            // travel/versions/agent/review/action.ts
  claimed = claimInline(runId)               // run?.status !== 'queued' || run.workflowId -> null
  { report, review } = StandaloneSession.turn(ctx, claimed)
  if (isAborted(runId)) return null
  finishInline({ runId, report, status: 'complete' })   // on error: 'failed' with failTurn(...)
// not claimed and still queued/running -> 'A review of this idea is in progress.'
```

Source: [crons.ts](../../../packages/backend/convex/crons.ts#L8),
[runs/index.ts `failStaleRuns`](../../../packages/backend/convex/modules/assistant/runs/index.ts#L481),
[engine/turns.ts `runInline`](../../../packages/backend/convex/modules/assistant/engine/turns.ts#L151),
[review/action.ts](../../../packages/backend/convex/modules/travel/versions/agent/review/action.ts#L7).

## Failure, retries and resumed authority

Turns never retry, because a tool may already have committed a write. Each
turn calls `AssistantProvider.configured` and binds the run actor again, so a
resumed run rechecks membership and the creator's ChatGPT connection. Retrying
is explicit: `retryIssueRun` queues a fresh run with a new workflow.

```ts
failTurn(ctx, run, error, resumed):
  message = AssistantErrors.message(error)
  reconnect = resumed && isConnectionError(message)
    // CONNECTION_ERRORS = ['Connect ChatGPT', 'Select an available ChatGPT model',
    //                      'ChatGPT plan usage is unavailable']
  record(run.id, { kind: 'error', detail: message, label: reconnect ? RECONNECT_CHATGPT_LABEL : 'Run failed' })
  return reconnect ? 'Reconnect ChatGPT to continue' : message
```

Source: [engine/turns.ts `failTurn`](../../../packages/backend/convex/modules/assistant/engine/turns.ts#L97),
[engine/schema.ts](../../../packages/backend/convex/modules/assistant/engine/schema.ts#L51).

## Versioning the frozen workflow

Suspended runs replay `agentRun` across deploys, so its step sequence must not
change. A test pins the SHA-256 of `workflow.ts`. Behavior belongs in the
`turn.run` action, which the journal records only by name. Rollback is
forward-only: keep the optional `agentRuns` fields and the `workflow` component
mount ([modules README](../../../packages/backend/convex/modules/README.md)).

```ts
FROZEN_AGENT_RUN_SHA256 = '05a078637630b9349313cbc518142e2dd2420de3fb12ed93c1459b569cac3f06'
expect(sha256(readFileSync('./workflow.ts'))).toBe(FROZEN_AGENT_RUN_SHA256)
// one turn journals [{ kind: 'function', name: 'modules/assistant/engine/turn:run' }]
// A real change ships agentRunV2 beside agentRun; never update the hash to pass.
```

Source: [engine/workflow.test.ts](../../../packages/backend/convex/modules/assistant/engine/workflow.test.ts#L19).

## Invariants and tests

- Frozen body and one journaled step per turn:
  [engine/workflow.test.ts](../../../packages/backend/convex/modules/assistant/engine/workflow.test.ts).
- One workflow per run, a stop cancels it and keeps the run aborted, a stale
  re-claim hands the reply to the new run:
  [engine/engine.test.ts](../../../packages/backend/convex/modules/assistant/engine/engine.test.ts).
- A stopped run is never claimed; a stop during a resumed turn writes no
  report: [engine/turn-guards.test.ts](../../../packages/backend/convex/modules/assistant/engine/turn-guards.test.ts).
- Stalled and exhausted copy, missing runs ignored by `onComplete`:
  [engine/lifecycle.test.ts](../../../packages/backend/convex/modules/assistant/engine/lifecycle.test.ts).
- One active wait ('a run can hold only one active wait'), running workflow
  runs only, 14-day deadline, a turn kept to resume, idempotent resolution,
  signals past the first batch:
  [waits/waits.test.ts](../../../packages/backend/convex/modules/assistant/waits/waits.test.ts).
- Undeliverable events fail the run; an ending run closes its wait without
  reading the entity: [waits/guards.test.ts](../../../packages/backend/convex/modules/assistant/waits/guards.test.ts).
- Domain writes meet or cancel waits:
  [waits/domain-waits.test.ts](../../../packages/backend/convex/modules/assistant/waits/domain-waits.test.ts),
  [waits/roster-waits.test.ts](../../../packages/backend/convex/modules/assistant/waits/roster-waits.test.ts).
- Timers resume the same run, a stopped waiting run does not resume, a resume
  without ChatGPT asks to reconnect, waiting runs are never swept:
  [engine/resume.test.ts](../../../packages/backend/convex/modules/assistant/engine/resume.test.ts).
- The sweep touches only unowned stuck runs:
  [runs/runs.test.ts](../../../packages/backend/convex/modules/assistant/runs/runs.test.ts).
- `stopAfterWait` ends on the wait step:
  [stop.test.ts](../../../packages/backend/assistant/tools/agent/stop.test.ts);
  a finished run acts for nobody:
  [auth/actor.test.ts](../../../packages/backend/convex/modules/auth/actor.test.ts).

## Extending

**A new wait condition kind.** No project skill covers this yet. Steps:

1. Add the condition, kind and snapshot variants in
   [waits/schema.ts](../../../packages/backend/convex/modules/assistant/waits/schema.ts#L30).
   Changes there must be additive only.
2. Write `conditions/<kind>.ts` with
   `defineWaitCondition({ kind, refId, load, judge, label, validate })`.
   `validate` checks the target against `WaitScope.viewer`, and `load` reads
   only what `refId` names.
3. Register it in `waitConditionKinds` in
   [conditions/index.ts](../../../packages/backend/convex/modules/assistant/waits/conditions/index.ts#L17).
4. Map the model input in `waitConditionInputSchema` and `toCondition` in
   [tools/agent/waits.ts](../../../packages/backend/assistant/tools/agent/waits.ts).
5. Call `AgentWaits.signal({ kind, refId })` from every domain write that can
   change the outcome, with `deleted: true` when the entity is removed.
6. Add tests following
   [add-convex-test](../../../.claude/skills/add-convex-test/SKILL.md).

**New run behavior.** Change turns, sessions or tools, never `workflow.ts`. New
agents and tools follow
[AI contracts implementation](../ai-contracts/implementation.md#extending).
