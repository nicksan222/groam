import { activityKinds } from '#convex/modules/travel/issues/rules/kinds/activities';
import { destinationKinds } from '#convex/modules/travel/issues/rules/kinds/destinations';
import { moneyKinds } from '#convex/modules/travel/issues/rules/kinds/money';
import { peopleKinds } from '#convex/modules/travel/issues/rules/kinds/people';
import { stayKinds } from '#convex/modules/travel/issues/rules/kinds/stays';
import { transferKinds } from '#convex/modules/travel/issues/rules/kinds/transfers';
import { tripKinds } from '#convex/modules/travel/issues/rules/kinds/trip';
import type { ClauseKindDefinitions } from '#convex/modules/travel/issues/rules/types';

/** Every clause kind; the annotation fails to compile if a kind in the validator is missing. */
export const clauseKinds: ClauseKindDefinitions = {
  ...tripKinds,
  ...moneyKinds,
  ...destinationKinds,
  ...activityKinds,
  ...stayKinds,
  ...transferKinds,
  ...peopleKinds
};
