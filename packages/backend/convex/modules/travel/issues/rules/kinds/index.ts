import { dailyActivities } from '#convex/modules/travel/issues/rules/kinds/activities/daily';
import { activitiesDetailed } from '#convex/modules/travel/issues/rules/kinds/activities/detailed';
import { destinationActivities } from '#convex/modules/travel/issues/rules/kinds/activities/everywhere';
import { noTimeConflicts } from '#convex/modules/travel/issues/rules/kinds/activities/overlaps';
import { hasDestination } from '#convex/modules/travel/issues/rules/kinds/destinations/chosen';
import { daysAssigned } from '#convex/modules/travel/issues/rules/kinds/destinations/days';
import { destinationNamed } from '#convex/modules/travel/issues/rules/kinds/destinations/place';
import { travelersGoing } from '#convex/modules/travel/issues/rules/kinds/people/going';
import { packingListed } from '#convex/modules/travel/issues/rules/kinds/people/listed';
import { packingPacked } from '#convex/modules/travel/issues/rules/kinds/people/packed';
import { staysDetailed } from '#convex/modules/travel/issues/rules/kinds/stays/detailed';
import { nightsCovered } from '#convex/modules/travel/issues/rules/kinds/stays/nights';
import { legsCovered } from '#convex/modules/travel/issues/rules/kinds/transfers/legs';
import { boundaryTransfer } from '#convex/modules/travel/issues/rules/kinds/transfers/travel';
import { withinBudget } from '#convex/modules/travel/issues/rules/kinds/trip/affordable';
import { hasBudget } from '#convex/modules/travel/issues/rules/kinds/trip/budget';
import { hasDates } from '#convex/modules/travel/issues/rules/kinds/trip/dates';
import { hasLength } from '#convex/modules/travel/issues/rules/kinds/trip/length';

/**
 * Every clause kind, one file each under `kinds/<category>/`, in picker order within a category.
 * The rule validator, the builder, the picker, and the AI drafter all read this list, so a new
 * kind is its file plus one line here; a test fails if a kind file is left off.
 */
export const clauseKindList = [
  hasDates,
  hasLength,
  hasBudget,
  withinBudget,
  hasDestination,
  destinationNamed,
  daysAssigned,
  dailyActivities,
  destinationActivities,
  activitiesDetailed,
  noTimeConflicts,
  nightsCovered,
  staysDetailed,
  boundaryTransfer,
  legsCovered,
  travelersGoing,
  packingListed,
  packingPacked
] as const;
