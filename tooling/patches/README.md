# Dependency patches

Bun applies these on install (`patchedDependencies` in the root `package.json`). Keep each one to the
smallest change that fixes the problem upstream, and drop it once a release carries the fix.

| Patch | Why | Drop when |
| --- | --- | --- |
| `playwright-core@1.63.0.patch` | `ProgressController.run` arms its timeout with `deadline - monotonicTime()` unclamped. Vitest polls elements through Playwright with 1 ms budgets, so on a busy runner the deadline has already passed and Node prints `TimeoutNegativeWarning`. The patch clamps it at zero, as the same file already does for its other deadline timer. | Playwright clamps that timer itself (still unclamped in 1.64.1). |
