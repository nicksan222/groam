import { shadcnComponentDefinitions } from '@json-render/shadcn/catalog';
import { AssistantFormComponentKind } from '#ai-contracts/output/kind';

export class SwitchFormComponent extends AssistantFormComponentKind {
  constructor() {
    super({ definition: shadcnComponentDefinitions.Switch, id: 'Switch' });
  }
}
