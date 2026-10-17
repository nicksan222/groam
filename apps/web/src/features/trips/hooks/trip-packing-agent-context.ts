import type { AgentScreenContext } from '@groam/ai/ui/context/agent-context';
import type { TripDetail } from './use-trips';

/**
 * What the assistant sees on the Packing tab: the group gear and its coverage. The viewer's
 * private personal list is never part of this context.
 */
export function packingAgentContext(
  trip: TripDetail,
  base: Record<string, unknown>,
  groupGear: ReadonlyArray<{
    bringers: Array<{ count: number; name: string; userId: string }>;
    brought: number;
    id: string;
    label: string;
    quantity: number;
  }>,
  travelers: ReadonlyArray<{ name: string; status: string; userId: string }>
): Pick<AgentScreenContext, 'capabilities' | 'data' | 'description'> {
  const viewerCanEdit = Boolean(trip.proposal) && trip.permissions.canEdit;
  return {
    capabilities: [
      'trip.status.read',
      'trip.packing.read',
      ...(viewerCanEdit ? (['trip.packing.manage'] as const) : []),
      // The viewer's private list: tools exist in private chats only; its items never appear here.
      'trip.packing.personal.read',
      ...(trip.archivedAt ? [] : (['trip.packing.personal.manage'] as const))
    ],
    data: {
      ...base,
      // Edits happen only in an idea working copy by its author; on the shared trip the
      // assistant starts an idea first and then edits that idea's working trip.
      viewerCanEdit,
      needsIdeaToEdit: !trip.proposal && !trip.archivedAt,
      packingCapabilities: viewerCanEdit
        ? [
            'read group gear',
            'add, rename, resize, remove group gear',
            'assign who brings how many'
          ]
        : ['read group gear'],
      // The personal list is private to the viewer and deliberately not part of this context.
      personalList: {
        privateToViewer: true,
        note: 'The viewer keeps a private checklist for this trip. Its items are not shown here.'
      },
      travelers: travelers.map((traveler) => ({ ...traveler })),
      groupGear: groupGear.map((item) => ({
        ...item,
        missing: Math.max(0, item.quantity - item.brought)
      }))
    },
    description: trip.proposal
      ? 'The idea’s group gear: items the group shares, how many are needed, and who brings how many. Help add items and assign bringers. The viewer’s private personal list is not visible to you.'
      : 'The shared trip’s group gear: items the group shares, how many are needed, and who brings how many. Group gear changes through an idea. The viewer’s private personal list is not visible to you.'
  };
}
