import { cronJobs } from 'convex/server';
import { internal } from '#convex-generated/api';

const crons = cronJobs();

// Runs can die mid-action (timeout, crash) and would otherwise show "Working…" forever.
crons.interval(
  'fail stale agent runs',
  { minutes: 5 },
  internal.modules.assistant.runs.functions.sweepStaleRuns,
  {}
);

export default crons;
