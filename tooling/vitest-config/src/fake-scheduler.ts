import { vi } from 'vite-plus/test';

// convex-test runs scheduled functions on setTimeout; faking it keeps background work (AI runs,
// cover lookups) from running behind unrelated tests. Opt out with `vi.useRealTimers()`.
vi.useFakeTimers({ toFake: ['clearTimeout', 'setTimeout'] });
