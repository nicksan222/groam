import { AssistantTagKind } from '#ai-contracts/agents/registry/tags/kind';

export class DestinationTag extends AssistantTagKind<'destination', 'tripDestinations'> {
  constructor() {
    super({ kind: 'destination', table: 'tripDestinations' });
  }
}
