import { workspaceQuery } from '#convex/modules/auth/workspace';
import { listTurn, TripTurnValidators } from '#convex/modules/travel/trips/turn';

export const run = workspaceQuery({
  args: {},
  returns: TripTurnValidators.result,
  handler: (ctx) => listTurn(ctx)
});
