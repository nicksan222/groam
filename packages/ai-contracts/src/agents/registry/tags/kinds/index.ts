import { assistantContextTagKinds } from '#ai-contracts/agents/registry/tags/ids';
import { AssistantTagKind } from '#ai-contracts/agents/registry/tags/kind';
import { ActivityTag } from '#ai-contracts/agents/registry/tags/kinds/activity';
import { DestinationTag } from '#ai-contracts/agents/registry/tags/kinds/destination';
import { TripTag } from '#ai-contracts/agents/registry/tags/kinds/trip';

AssistantTagKind.subscribe(new TripTag());
AssistantTagKind.subscribe(new DestinationTag());
AssistantTagKind.subscribe(new ActivityTag());

const registered = new Set(AssistantTagKind.all().map((kind) => kind.kind));
for (const kind of assistantContextTagKinds) {
  if (!registered.has(kind)) {
    throw new Error(`Assistant context tag '${kind}' must be subscribed in kinds/index.ts`);
  }
}
