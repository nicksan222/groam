import { defineWaitCondition } from '#convex/modules/assistant/waits/conditions/types';

/** Met only by its deadline: "check back in N hours". */
export const timerCondition = defineWaitCondition({
  judge: () => ({
    met: false,
    progress: null,
    snapshot: { kind: 'timer' },
    summary: 'Timer elapsed'
  }),
  kind: 'timer',
  label: async () => 'a timer',
  load: async () => null,
  refId: () => 'timer',
  validate: async (_ctx, _condition, scope) => ({ tripId: scope.tripId })
});
