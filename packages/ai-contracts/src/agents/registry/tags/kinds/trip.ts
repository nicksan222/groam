import { AssistantTagKind } from '#ai-contracts/agents/registry/tags/kind';

export class TripTag extends AssistantTagKind<'trip', 'trips'> {
  constructor() {
    super({ kind: 'trip', table: 'trips' });
  }
}
