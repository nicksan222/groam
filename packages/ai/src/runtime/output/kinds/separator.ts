import { shadcnComponentDefinitions } from '@json-render/shadcn/catalog';
import { AssistantFormComponentKind } from '#ai/runtime/output/kind';

export class SeparatorFormComponent extends AssistantFormComponentKind {
  constructor() {
    super({ definition: shadcnComponentDefinitions.Separator, id: 'Separator' });
  }
}
