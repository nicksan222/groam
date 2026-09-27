import { createTool } from '@convex-dev/agent';
import type { AssistantCapability } from '@groam/ai/agents';
import { assistantContextTagInputSchema, referenceForMutation } from '@groam/ai/runtime/tags';
import { assistantToolSpecs } from '@groam/ai/tools/specs';
import type { ToolSet } from 'ai';
import * as z from 'zod/v3';
import {
  type AssistantCapabilityRegistration,
  type AssistantToolRuntime,
  defineCapability
} from '#backend/assistant/tools/factory';
import {
  createAddActivityTool,
  createRemoveActivityTool,
  createUpdateActivityTool
} from '#backend/assistant/tools/trips/activity';
import { createSetItineraryCostTool } from '#backend/assistant/tools/trips/costs';
import { createSetTripDatesTool } from '#backend/assistant/tools/trips/dates';
import {
  createAddDestinationTool,
  createRemoveDestinationTool,
  createSetDestinationScheduleTool
} from '#backend/assistant/tools/trips/destinations';
import { createUpdateTripDetailsTool } from '#backend/assistant/tools/trips/details';
import { createExtendItineraryTool } from '#backend/assistant/tools/trips/extend';
import { createTripIssueTool } from '#backend/assistant/tools/trips/issue';
import {
  createListPackingTool,
  createManagePackingTool
} from '#backend/assistant/tools/trips/packing';
import { createTripProposalTool } from '#backend/assistant/tools/trips/proposal';
import {
  createGetItineraryTool,
  createGetTripStatusTool
} from '#backend/assistant/tools/trips/reads';
import {
  createAddStayTool,
  createRemoveStayTool,
  createUpdateStayTool
} from '#backend/assistant/tools/trips/stays';
import {
  createRemoveTransferTool,
  createSetTransferTool
} from '#backend/assistant/tools/trips/transfers';
import { createStartTripVersionTool } from '#backend/assistant/tools/trips/version';
import {
  createApplyTripVersionTool,
  createApproveTripVersionTool,
  createSetTravelerRsvpTool
} from '#backend/assistant/tools/trips/workflow';
import type { AssistantContextCatalogItem } from '#convex/modules/assistant/model/index';
import type { AssistantScreen } from '#convex/modules/assistant/screen/index';
import { internal } from '#convex-generated/api';

/**
 * Executable bindings, one per tool spec, in catalog order. Each row spreads
 * its spec from `@groam/ai/tools/specs` and adds only the Convex-bound
 * `create` closure — spec fields are never redeclared here. Run logs record
 * usage from `toolName` / `eventLabel`; do not add a second tool-name or
 * event-kind map.
 */
const emptyInputSchema = z.object({});

function screenContextSnapshot(screen: AssistantScreen) {
  let data: unknown = screen.data;
  try {
    data = JSON.parse(screen.data);
  } catch {
    // Keep non-JSON context as text.
  }
  return {
    capabilities: screen.capabilities,
    data,
    description: screen.description,
    key: screen.key,
    target: screen.target,
    title: screen.title
  };
}

const assistantCapabilityBindings = {
  'context.chat.read': defineCapability({
    ...assistantToolSpecs['context.chat.read'],
    create: ({ scope, threadId }) => {
      if (scope === 'standalone' || !threadId) return null;
      return createTool({
        description:
          'Read the authoritative trips, destinations, and activities currently attached to this AI chat. Use this whenever saved context would help.',
        execute: async (toolCtx) => {
          const context = await toolCtx.runQuery(
            internal.modules.assistant.model.index.taggedContext,
            {
              scope,
              threadId
            }
          );
          return { context };
        },
        inputSchema: emptyInputSchema
      });
    }
  }),
  'context.chat.set': defineCapability({
    ...assistantToolSpecs['context.chat.set'],
    create: ({ scope, threadId }) => {
      if (scope === 'standalone' || !threadId) return null;
      return createTool({
        description:
          'Replace the attachments on this AI chat with confirmed trip, destination, or activity ids from findWorkspaceContext.',
        execute: async (toolCtx, input) => {
          const tags = await toolCtx.runMutation(
            internal.modules.assistant.model.index.setContextTags,
            {
              scope,
              tags: input.tags.map((tag) => referenceForMutation(tag)),
              threadId
            }
          );
          return { tags };
        },
        inputSchema: z.object({
          tags: z
            .array(assistantContextTagInputSchema())
            .max(12)
            .describe('The complete set of entities that should remain attached to this AI chat.')
        })
      });
    }
  }),
  'context.screen.read': defineCapability({
    ...assistantToolSpecs['context.screen.read'],
    create: ({ screen }) =>
      createTool({
        description: `Read the data and purpose registered by the current ${screen.title} page. Use this before asking the traveler to identify something already shown on the page.`,
        execute: async () => ({
          context: screenContextSnapshot(screen)
        }),
        inputSchema: emptyInputSchema
      })
  }),
  'context.workspace.find': defineCapability({
    ...assistantToolSpecs['context.workspace.find'],
    create: () =>
      createTool({
        description:
          'Find exact trip, destination, or activity ids in the workspace when the current screen and AI chat attachments are not enough.',
        execute: async (toolCtx, input) => {
          const catalog: AssistantContextCatalogItem[] = await toolCtx.runQuery(
            internal.modules.assistant.model.index.contextCatalog,
            {}
          );
          const query = input.query.trim().toLocaleLowerCase();
          const results = catalog
            .filter((item) =>
              `${item.label} ${item.description}`.toLocaleLowerCase().includes(query)
            )
            .slice(0, 20);
          return { results };
        },
        inputSchema: z.object({
          query: z.string().min(1).max(100).describe('A trip, place, or activity name.')
        })
      })
  }),
  'trip.activity.add': defineCapability({
    ...assistantToolSpecs['trip.activity.add'],
    create: ({ activeTripId }) => createAddActivityTool(activeTripId)
  }),
  'trip.activity.remove': defineCapability({
    ...assistantToolSpecs['trip.activity.remove'],
    create: ({ activeTripId }) => createRemoveActivityTool(activeTripId)
  }),
  'trip.activity.update': defineCapability({
    ...assistantToolSpecs['trip.activity.update'],
    create: ({ activeTripId }) => createUpdateActivityTool(activeTripId)
  }),
  'trip.cost.manage': defineCapability({
    ...assistantToolSpecs['trip.cost.manage'],
    create: ({ activeTripId }) => createSetItineraryCostTool(activeTripId)
  }),
  'trip.create': defineCapability({
    ...assistantToolSpecs['trip.create'],
    create: ({ scope, threadId }) =>
      scope === 'standalone' || !threadId ? null : createTripProposalTool(threadId, scope)
  }),
  'trip.dates.set': defineCapability({
    ...assistantToolSpecs['trip.dates.set'],
    create: ({ activeTripId }) => createSetTripDatesTool(activeTripId)
  }),
  'trip.destination.add': defineCapability({
    ...assistantToolSpecs['trip.destination.add'],
    create: ({ activeTripId }) => createAddDestinationTool(activeTripId)
  }),
  'trip.destination.remove': defineCapability({
    ...assistantToolSpecs['trip.destination.remove'],
    create: ({ activeTripId }) => createRemoveDestinationTool(activeTripId)
  }),
  'trip.destination.schedule': defineCapability({
    ...assistantToolSpecs['trip.destination.schedule'],
    create: ({ activeTripId }) => createSetDestinationScheduleTool(activeTripId)
  }),
  'trip.details.update': defineCapability({
    ...assistantToolSpecs['trip.details.update'],
    create: ({ activeTripId }) => createUpdateTripDetailsTool(activeTripId)
  }),
  'trip.issue.create': defineCapability({
    ...assistantToolSpecs['trip.issue.create'],
    create: ({ activeTripId }) => createTripIssueTool(activeTripId)
  }),
  'trip.itinerary.extend': defineCapability({
    ...assistantToolSpecs['trip.itinerary.extend'],
    create: ({ activeTripId }) => createExtendItineraryTool(activeTripId)
  }),
  'trip.itinerary.read': defineCapability({
    ...assistantToolSpecs['trip.itinerary.read'],
    create: ({ activeTripId }) => createGetItineraryTool(activeTripId)
  }),
  'trip.packing.manage': defineCapability({
    ...assistantToolSpecs['trip.packing.manage'],
    create: ({ activeTripId }) => createManagePackingTool(activeTripId)
  }),
  'trip.packing.read': defineCapability({
    ...assistantToolSpecs['trip.packing.read'],
    create: ({ activeTripId }) => createListPackingTool(activeTripId)
  }),
  'trip.stay.add': defineCapability({
    ...assistantToolSpecs['trip.stay.add'],
    create: ({ activeTripId }) => createAddStayTool(activeTripId)
  }),
  'trip.stay.remove': defineCapability({
    ...assistantToolSpecs['trip.stay.remove'],
    create: ({ activeTripId }) => createRemoveStayTool(activeTripId)
  }),
  'trip.stay.update': defineCapability({
    ...assistantToolSpecs['trip.stay.update'],
    create: ({ activeTripId }) => createUpdateStayTool(activeTripId)
  }),
  'trip.status.read': defineCapability({
    ...assistantToolSpecs['trip.status.read'],
    create: ({ activeTripId }) => createGetTripStatusTool(activeTripId)
  }),
  'trip.traveler.set': defineCapability({
    ...assistantToolSpecs['trip.traveler.set'],
    create: ({ activeTripId }) => createSetTravelerRsvpTool(activeTripId)
  }),
  'trip.transfer.remove': defineCapability({
    ...assistantToolSpecs['trip.transfer.remove'],
    create: ({ activeTripId }) => createRemoveTransferTool(activeTripId)
  }),
  'trip.transfer.set': defineCapability({
    ...assistantToolSpecs['trip.transfer.set'],
    create: ({ activeTripId }) => createSetTransferTool(activeTripId)
  }),
  'trip.version.apply': defineCapability({
    ...assistantToolSpecs['trip.version.apply'],
    create: () => createApplyTripVersionTool()
  }),
  'trip.version.approve': defineCapability({
    ...assistantToolSpecs['trip.version.approve'],
    create: () => createApproveTripVersionTool()
  }),
  'trip.version.start': defineCapability({
    ...assistantToolSpecs['trip.version.start'],
    create: ({ activeTripId, issueId, runId }) =>
      createStartTripVersionTool(activeTripId, { issueId, runId })
  }),
  'ui.askUserChoice': defineCapability({
    ...assistantToolSpecs['ui.askUserChoice'],
    create: ({ scope }) =>
      scope === 'standalone'
        ? null
        : createTool({
            description:
              'Present a short clarification question with exactly three tappable answers; the interface always adds a fourth free-text answer. Use only when missing information blocks a useful answer. Never use it to ask permission to complete the traveler’s requested review, suggestion, recommendation, summary, or explanation.',
            execute: async (_toolCtx, input) => input,
            inputSchema: z.object({
              options: z.array(z.string().min(1).max(100)).length(3),
              question: z.string().min(1).max(240)
            })
          })
  }),
  'web.search': defineCapability({
    ...assistantToolSpecs['web.search'],
    createToolSet: ({ providerTools }) => providerTools ?? null
  })
} satisfies EnsureAllSpecsBound;

// Keyed by the spec-id union: a spec without a binding row above fails
// typecheck at the table, which is the single source of bound ids.
type EnsureAllSpecsBound = {
  [K in AssistantCapability]: AssistantCapabilityRegistration;
};

export function buildAssistantToolRegistry(bindings: readonly AssistantCapabilityRegistration[]) {
  const byId = new Map<string, AssistantCapabilityRegistration>();
  const byName = new Map<string, AssistantCapabilityRegistration>();
  for (const registration of bindings) {
    if (byId.has(registration.id)) {
      throw new Error(`Assistant capability '${registration.id}' is already registered`);
    }
    if (byName.has(registration.toolName)) {
      throw new Error(`Assistant tool '${registration.toolName}' is already registered`);
    }
    byId.set(registration.id, registration);
    byName.set(registration.toolName, registration);
  }
  return { byId, byName };
}

const registry = buildAssistantToolRegistry(Object.values(assistantCapabilityBindings));

export function allAssistantTools(): AssistantCapabilityRegistration[] {
  return Object.values(assistantCapabilityBindings);
}

export function assistantToolByName(toolName: string): AssistantCapabilityRegistration | undefined {
  return registry.byName.get(toolName);
}

export function assistantToolSet(
  registration: AssistantCapabilityRegistration,
  runtime: AssistantToolRuntime
): ToolSet | null {
  if (registration.createToolSet) {
    return registration.createToolSet(runtime);
  }
  const tool = registration.create(runtime);
  return tool ? { [registration.toolName]: tool } : null;
}
