import { AssistantTagKind } from '#ai-contracts/agents/registry/tags/kind';

export class ActivityTag extends AssistantTagKind<'activity', 'tripDestinationActivities'> {
  constructor() {
    super({ kind: 'activity', table: 'tripDestinationActivities' });
  }
}
