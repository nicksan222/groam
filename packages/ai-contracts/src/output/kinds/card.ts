import { shadcnComponentDefinitions } from '@json-render/shadcn/catalog';
import { AssistantFormComponentKind } from '#ai-contracts/output/kind';

export class CardFormComponent extends AssistantFormComponentKind {
  constructor() {
    super({ definition: shadcnComponentDefinitions.Card, id: 'Card' });
  }
}
