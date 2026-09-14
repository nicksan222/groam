# @groam/showcase

A 3:52 walkthrough of two people planning a trip: create, browse ideas, inspect
changes, approve proposals, revise dates, merge, chat, and react to messages.
The output is dark, 16:9, **3840 × 2160 at 60 fps**.

## One file to edit

**`video.ts` is the source of truth.** It owns the cast, demo data, preparation,
actions, captions, screen choices, output settings, and duration of every scene.
Read it top to bottom to read the film. Its 27 scenes total 232 seconds, with at
least five seconds per scene.

```ts
shot('request', 'Ask for a date change', {
  seconds: 7,
  view: split(traveler, organizer),
  subtitle: '“I arrive on the 10th. Can we move it a day later?”',
  steps: [
    perform(traveler, 'Request a date change', (user, director) =>
      requestIdeaChanges(user, message, [director.actor(organizer.id).page])
    )
  ]
})
```

Use `solo`, `split`, `pip`, or `grid` to choose whose desktop is visible. Every view preserves the complete desktop and its aspect ratio. Steps run in order. `perform` binds a cast member to any `@groam/app-actions/playwright` workflow while preserving the recorded pointer.
`parallel` is available for
independent actions. Ordinary tests and the showcase use the same locators, waits, navigation,
and product workflows.

`seconds` is the **finished scene duration**, independent of app response time.
The edit fits the actions and reserves `presentation.resultHoldSeconds` for
the verified result (two seconds in this film). Both users follow the same source
clock, and `presentation.maxIdleSeconds` shortens loading gaps without rushing
pointer or typing sequences. Omit `seconds` for
natural playback; `speed`, `trimStart`, and `trimEnd` support manual editing.
Capture-only `leadIn` and `hold` default to 0.75 and 1.5 seconds.

## Run

From the repository root, with the local app running:

```bash
bun run showcase:setup              # install framework browsers once
bun run showcase                    # reset + full seed + capture + edit + render
bun run showcase:studio             # inspect the Remotion timeline
```

For presentation changes, reuse the recording:

```bash
bun run showcase:edit
bun run showcase:render              # final 4K MP4
bun run showcase:render -- --draft    # optional 1080p preview
```

Changed actions, new scene IDs, capture settings, or capture pauses need
`bun run showcase:capture` first. Keep IDs stable when changing captions or
pacing. Run one capture/edit command at a time; they share the active manifest.

The root `bun run showcase` command first runs the canonical clean `realistic`
seed (30 users, 40 trips), removing old local app/auth/component data and E2E
leftovers. It then creates the Lisbon trip and three proposals through the app, including a final four-change idea.
The local backend must already be running. Seeding failure stops generation.
The lower-level capture/edit/render commands skip seeding for quick iteration.
The seeded owner and traveler must share a workspace.
Only external destination search is replaced with the fixture in `video.ts`;
trip creation, dates, feedback, replies, approvals and merges use the real backend.
Both participants assert the shared result. The reset is local only; no deployment runs.

## Harness map

| Location | Responsibility |
| --- | --- |
| `video.ts` | The film — edit here |
| `../app-actions/src/playwright/` | Shared Groam UI workflows for tests and films |
| src/authoring/storyboard.ts | Typed scenes, actions and screen choices |
| `src/capture/` | Isolated browser sessions, PNG capture, common clock |
| `src/video/` | Remotion composition, windows, transitions and cursor |
| `src/edit.ts`, `src/timeline.ts` | Compile scene durations and map source time |
| `src/model.ts` | Validate captures and edits |
| `src/cli.ts`, `src/render.ts` | Commands and framework rendering |

Playwright handles browser automation; Remotion handles the timeline, Studio
and H.264 encoding. Zod validates the manifests. No additional framework or
custom animation engine is needed.

The viewport is 1920 × 1080 CSS pixels at 2× device scale. Lossless screenshots
are checked for actual 3840 × 2160 pixels. Capture cadence depends on the machine;
the composition and cursor animate at 60 fps. A navigation-interrupted screenshot
retries once. Credentials are entered before recording. Intro/outro cards are off;
optional audio and cards can be configured through `presentation` in `video.ts`.

## Outputs and reproducibility

Only **`artifacts/showcase.mp4`** is Git-eligible among generated outputs.
Capture manifests, lossless frames, compiled JSON, posters, drafts, and temporary
renders are ignored. The final MP4 is replaced only after successful rendering.

Rebuild from code with `bun run showcase`. Live app timings and surrounding data
can vary; authored scene durations stay fixed. For an exact rerender of a specific
recording, retain its manifest and referenced PNG directory outside Git. Failed
captures preserve the last successful manifest and write ignored diagnostics.

Validated configuration comes from `@groam/env/showcase`: `SHOWCASE_BASE_URL`
(default `http://localhost:5173`), `SHOWCASE_HEADED`, `SHOWCASE_OWNER_EMAIL`,
`SHOWCASE_MEMBER_EMAIL`, `SHOWCASE_MEMBER_NAME`, and `SHOWCASE_PASSWORD`.
Defaults use the local demo accounts created by `just seed` through
`@groam/app-actions/backend`.

```bash
bun run --cwd tooling/showcase typecheck
bun run --cwd tooling/showcase lint
bun run --cwd tooling/showcase test
bun run --cwd tooling/showcase test:browser
bun run lint:conventions
```

Keep Remotion package versions identical when updating. References:
[Playwright screenshots](https://playwright.dev/docs/api/class-page#page-screenshot),
[Remotion rendering](https://www.remotion.dev/docs/renderer/render-media),
[Remotion license](https://www.remotion.dev/license).
