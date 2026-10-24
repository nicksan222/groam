import { type Infer, v } from 'convex/values';
import { TripActivityValidators } from '#convex/modules/travel/activities/schema';
import { TripTargetValidators } from '#convex/modules/travel/targets/schema';
import { tripCostSplitValidator } from '#convex/modules/travel/trips/costs';
import { tripCurrencyValidator } from '#convex/modules/travel/trips/currencies';

export const MAX_CONTEXT_TAGS = 12;
export const MAX_CATALOG_TRIPS = 25;

export const conversationScopeValidator = v.union(v.literal('private'), v.literal('discussion'));
export type ConversationScope = Infer<typeof conversationScopeValidator>;

export const assistantContextTagValidator = v.object({
  id: v.string(),
  kind: TripTargetValidators.contextTagKind,
  label: v.string(),
  tripId: v.string()
});

export const assistantContextTagReferenceValidator = TripTargetValidators.contextTag;

export type AssistantContextTagReference = Infer<typeof assistantContextTagReferenceValidator>;

export const assistantChatValidator = v.object({
  contextKey: v.union(v.string(), v.null()),
  contextTitle: v.union(v.string(), v.null()),
  createdAt: v.number(),
  id: v.string(),
  status: v.union(v.literal('active'), v.literal('archived')),
  tags: v.array(assistantContextTagValidator),
  title: v.string(),
  updatedAt: v.number()
});

export type AssistantChat = Infer<typeof assistantChatValidator>;

export const assistantContextCatalogItemValidator = assistantContextTagValidator.extend({
  description: v.string()
});

export type AssistantContextCatalogItem = Infer<typeof assistantContextCatalogItemValidator>;

export const taggedContextEntryValidator = assistantContextTagValidator.extend({
  details: v.string()
});

export type TaggedContextEntry = Infer<typeof taggedContextEntryValidator>;

export const tripAssistantContextValidator = v.object({
  archived: v.boolean(),
  canEdit: v.boolean(),
  costTargets: v.array(
    v.object({
      amount: v.union(v.number(), v.null()),
      id: v.string(),
      kind: TripTargetValidators.costKind,
      label: v.string(),
      split: tripCostSplitValidator
    })
  ),
  currency: tripCurrencyValidator,
  dateNotes: v.union(v.string(), v.null()),
  destinations: v.array(
    v.object({
      activities: v.array(
        v.object({
          cost: v.union(v.number(), v.null()),
          costSplit: tripCostSplitValidator,
          day: v.number(),
          endDay: v.number(),
          id: v.id('tripDestinationActivities'),
          timeBlock: TripActivityValidators.timeBlock,
          title: v.string()
        })
      ),
      countryCode: v.union(v.string(), v.null()),
      endDay: v.union(v.number(), v.null()),
      id: v.id('tripDestinations'),
      name: v.string(),
      startDay: v.union(v.number(), v.null()),
      stays: v.array(
        v.object({
          checkInDay: v.number(),
          checkOutDay: v.number(),
          cost: v.union(v.number(), v.null()),
          costSplit: tripCostSplitValidator,
          id: v.id('tripDestinationStays'),
          title: v.string()
        })
      )
    })
  ),
  groupMemberCount: v.number(),
  initialBudget: v.union(v.number(), v.null()),
  primaryDestination: v.union(v.string(), v.null()),
  proposalStatus: v.union(
    v.literal('closed'),
    v.literal('conflicted'),
    v.literal('draft'),
    v.literal('in_review'),
    v.literal('merged'),
    v.null()
  ),
  startDate: v.union(v.string(), v.null()),
  totalDurationDays: v.union(v.number(), v.null()),
  totalPlannedCost: v.number(),
  tripName: v.string()
});

export type TripAssistantContext = Infer<typeof tripAssistantContextValidator>;

export const itineraryCostTargetValidator = TripTargetValidators.costBearing;
