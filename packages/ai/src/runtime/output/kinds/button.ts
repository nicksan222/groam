import { shadcnComponentDefinitions } from '@json-render/shadcn/catalog';
import { AssistantFormComponentKind } from '#ai/runtime/output/kind';

export class ButtonFormComponent extends AssistantFormComponentKind {
  constructor() {
    super({ definition: shadcnComponentDefinitions.Button, id: 'Button' });
  }
}
