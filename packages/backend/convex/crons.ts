import { cronJobs } from 'convex/server';
import { internal } from '#convex-generated/api';

const crons = cronJobs();

// Runs no workflow owns (legacy, inline reviews, never-started chat turns) would otherwise
// show "Working…" forever; workflow runs finish through onComplete.
crons.interval(
  'fail stale agent runs',
  { minutes: 5 },
  internal.modules.assistant.runs.functions.sweepStaleRuns,
  {}
);

crons.interval(
  'remove old emails from the resend component',
  { hours: 24 },
  internal.modules.auth.email.cleanupResend,
  {}
);

export default crons;
