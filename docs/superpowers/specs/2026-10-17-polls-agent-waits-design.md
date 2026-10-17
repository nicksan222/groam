# Polls and Agent Waits

Date: 2026-10-17
Status: Approved design, pending implementation plan

## Goal

Let a group decide things together through polls, and let AI agents ask the
group for preferences on their own. When an agent needs an answer from
everyone, it creates a poll, suspends its run, and resumes automatically once a
condition is met. The suspend/resume mechanism is generic: any agent run can
wait on any supported condition, and new condition kinds plug in without
touching the engine.

## Success criteria

- Travelers and workspace members create, vote on, retract, and close polls
  from a discussion or a trip page.
- An agent creates a poll when it judges it needs group preferences, picks a
  resume condition that fits the decision, and stops.
- While waiting, the run costs nothing: no live action, no polling, no cron
  scan. The agent still answers new messages in the same discussion normally.
- When the condition is met, or the deadline passes, the same run continues in
  the same thread with the outcome in context, without anyone prompting it.
- Adding a new wait kind takes one condition file, one validator variant, and
  one `signal` call in the domain write that can satisfy it.

## Decisions

- Polls are owned by a trip or a workspace. They render on the trip page and,
  when linked, inside a discussion.
- Humans and agents both create polls.
- All wait conditions are available; the agent chooses per poll. A deadline is
  always required as a safety cap.
- Wait kinds in v1: `poll`, `timer`, `issue`, `proposal`, `rsvp`.
- While an agent waits, the discussion stays open. New messages start normal
  runs; the waiting run is unaffected.
- Agent runs move onto `@convex-dev/workflow`. Rewriting the existing run
  plumbing is acceptable.

## Architecture

Three units with narrow interfaces:

1. **Run engine** (`modules/assistant/engine`): owns the lifecycle of every
   agent run as a durable workflow. Knows how to run a turn and how to wait for
   an event. Knows nothing about polls or conditions.
2. **Waits** (`modules/assistant/waits`): owns `agentWaits`, the condition
   registry, deadlines, and the bridge to workflow events. Knows nothing about
   how a turn runs.
3. **Polls** (`modules/polls`): owns polls and votes. Calls
   `AgentWaits.signal` after writes. Knows nothing about agents.

Domain modules (issues, proposals, travelers) also call `AgentWaits.signal`
from the writes that can satisfy a wait.

### 1. Run engine

Install `@convex-dev/workflow` in `convex.config.ts`. Define one workflow,
`agentRun`, whose body is a small generic loop:

```ts
let resume: WaitOutcome | undefined
for (let i = 0; i < MAX_TURNS; i++) {
  const result = await step.runAction(internal.…turn.run, { runId, resume })
  if (result.kind !== 'wait') return result
  resume = await step.awaitEvent({ id: result.eventId, validator: waitOutcome })
}
```

- The body must stay stable. Workflows can wait for days and replay across
  deploys; a changed body fails replay with a determinism violation. All agent
  behavior lives inside the `turn` action, which may change freely.
- `MAX_TURNS` (25) bounds the journal. Steps take and return IDs and small
  outcome objects only, never message content, so the journal stays far below
  the 1 MB step-data and 8 MiB journal limits.
- Chat and standalone runs share the `turn` action. Chat streams deltas with
  `saveStreamDeltas` from inside the action step, as today. Standalone uses
  `generateText`.
- The chat entry point becomes a mutation that creates the `agentRuns` row and
  starts the workflow. Standalone kickoff (issue/proposal assignment) starts
  the workflow instead of scheduling `standalone.execute`.
- `agentRuns` gains status `waiting` and fields `workflowId` and
  `activeWaitId`. The workflow's `onComplete` handler writes the final status
  (`complete`, `failed`, `aborted`) and report.
- Cancel calls `workflow.cancel` and cancels the active wait.
- `claimRun`, `finishRun`, and the `sweepStaleRuns` cron are removed once no
  legacy runs remain. Workflow retries and `onComplete` replace them.
- A turn runs as `run.createdBy` through that user's ChatGPT connection. If the
  connection is missing or invalid when a run resumes, the turn fails and
  records the event "Reconnect ChatGPT to continue".

### 2. Waits

Table `agentWaits`:

| Field | Type |
| --- | --- |
| `runId` | `Id<'agentRuns'>` |
| `workflowId` | string |
| `eventId` | string (from `createEvent`) |
| `workspaceId` | string |
| `tripId` | optional `Id<'trips'>` |
| `kind` | condition kind, denormalized for indexing |
| `refId` | string, the watched entity id, denormalized |
| `condition` | condition union |
| `deadlineAt` | number |
| `status` | `waiting \| met \| expired \| cancelled` |
| `outcome` | optional outcome object |
| `resolvedAt` | optional number |

Indexes: `by_kind_and_refId_and_status`, `by_runId`.

Condition union (v1):

- `poll { pollId, rule }`. `rule` is a non-empty any-of list of
  `allVoted`, `quorum { count } | quorum { percent }`,
  `optionVotes { min }`, `optionVotes { majority: true }`, `closed`.
- `timer {}`. Met only by its deadline.
- `issue { issueId, until: 'resolved' }`.
- `proposal { proposalId, until: 'approved' | 'decided' }`.
- `rsvp { tripId, rule: 'allResponded' | { going: number } }`.

Registry: one file per kind under `waits/conditions/`, each exporting
`refId(condition)` and `evaluate(ctx, condition) => { met, outcome }`. The
outcome carries a compact, model-readable snapshot (for a poll: question,
option tallies, voters who voted, eligible count).

Helpers (take `ctx`, run inside mutations):

- `AgentWaits.create(ctx, { runId, condition, deadlineAt })`: validates the
  deadline (required, at most 14 days out), creates the workflow event,
  inserts the row, schedules the deadline handler with `runAt`, and evaluates
  once. If already met, it resolves immediately.
- `AgentWaits.signal(ctx, { kind, refId })`: loads `waiting` rows by index,
  evaluates each, and resolves the met ones. Runs in the same transaction as
  the domain write, so Convex OCC prevents races between concurrent votes.
- `AgentWaits.cancel(ctx, { waitId, reason })`.
- Resolve: patch status, outcome, `resolvedAt`; call `sendEvent` with the
  outcome and `reason` (`met`, `deadline`, `cancelled`). The status check makes
  resolution idempotent; a second resolve is a no-op.
- Deadline handler (internal mutation): if the row is still `waiting`, mark it
  `expired` with a fresh snapshot and send the event.

Cost: each domain write reads only the waits on that entity. Each wait owns one
scheduled function. Nothing scans all waits.

### 3. Polls

Tables:

- `polls`: `workspaceId`, `tripId?`, `discussionId?`, `question`,
  `options: { id, label }[]` (2–10), `multiSelect`,
  `createdBy: { userId } | { agentId, runId }`, `status: open | closed`,
  `closesAt?`, `closedAt?`. Indexes `by_tripId_and_status`,
  `by_workspaceId_and_status`, `by_discussionId`.
- `pollVotes`: `pollId`, `userId`, `optionIds`, `updatedAt`. Index
  `by_pollId_and_userId`.

Eligible voters: trip polls use `tripTravelers` rows that have a `userId`
(invited people without accounts are excluded and not counted). Workspace
polls use workspace members via `systemRoster`, which works in scheduled code.

Public routes under `routes/polls/`: `create`, `vote`, `retract`, `close`,
`get`, `listByTrip`, `listByWorkspace`. Votes and retractions are limited to
eligible voters. Closing is limited to the creator or a workspace admin. Vote,
retract, and close call `AgentWaits.signal({ kind: 'poll', refId: pollId })`.
A poll with `closesAt` schedules its own close.

Tallies are computed from `pollVotes` on read. Group sizes are small (tens),
so no denormalized counters.

### 4. Agent tools

- `createPoll`: question, options, multi-select, optional `waitFor`
  (rule + deadline). Exempt from the write-intent gate, because the agent
  creates it on its own and it is harmless and reversible. Attaches to the
  current discussion and its trip, else the active trip, else the workspace.
- `waitFor`: any condition kind plus deadline. Creates the wait and stops the
  generation; the turn returns `{ kind: 'wait', eventId }`.
- `cancelWait`: cancels one of the run's or thread's pending waits.
- Agent context lists pending waits for the thread, so a run started by a new
  message can mention or cancel them.
- On resume, the turn writes a hidden system note to the thread ("Wait met:
  majority for 'Dinner Friday' — Sushi 4, Tapas 1; 5 of 6 voted") and
  continues the conversation.
- Prompt guidance: ask the group when a decision affects everyone; choose the
  rule by decision type (all voted for small binding choices, majority for
  quick picks, quorum for large groups); always set a sensible deadline.

### 5. UI

- `apps/web/src/features/polls`: `PollCard` (vote, change vote, tallies,
  closed state, who voted), create-poll dialog, trip "Polls" section.
- Discussion stream renders linked polls inline as cards. The composer gets a
  "Create poll" action.
- `packages/ai/src/ui/runs/agent-run-banner.tsx` shows a waiting state: what
  the run waits for, progress (for polls, "3 of 5 voted"), deadline, and a
  cancel button.
- Register agent screen context on the polls section.

### 6. Upgrade path

- Schema changes are additive: new tables, new optional fields, new status
  literal.
- At deploy, runs still `queued` or `running` on the legacy path are failed by
  a one-time migration with the error "Interrupted by upgrade". After that, the
  sweep cron and legacy claim/finish code are removed.

## Error handling

- Turn action errors: workflow retry policy for transient failures, then
  `onComplete` marks the run failed and closes any active wait.
- Wait creation with invalid input (missing deadline, past deadline, poll not
  in scope): the tool returns an error to the model; the run does not suspend.
- Event sent for an already-finished workflow: `sendEvent` failure is logged
  and the wait stays resolved.
- Deleted watched entity (poll, issue, proposal removed): `signal` from the
  delete resolves the wait with `reason: 'cancelled'` and a note.

## Testing

- convex-test, real routes via the shared `#testing` factory:
  - each condition evaluator, including edge cases (zero eligible voters,
    retracted vote, multi-select majority);
  - `signal` resolves only matching waits; double resolve is a no-op;
  - deadline expiry; cancel;
  - authorization: non-member cannot vote or read; non-creator cannot close;
  - workflow wait and resume with the workflow test registration.
- Browser-mode view tests: `PollCard` states, create dialog, banner waiting
  state.
- One journey: an agent creates a poll, travelers vote, the run resumes and
  posts a follow-up.

## Delivery phases

1. Run engine migration to `@convex-dev/workflow`, behavior unchanged.
2. Waits module with `timer`, `waitFor` and `cancelWait` tools, banner waiting
   state.
3. Polls module, routes, UI, `createPoll` tool, `poll` condition.
4. `issue`, `proposal`, `rsvp` condition kinds.

## Out of scope

- Anonymous polls, ranked-choice voting, free-text options added by voters.
- Waiting on conditions across workspaces.
- Notifications (email/push) when a poll opens; the existing in-app surfaces
  only.
