import { shadcnComponentDefinitions } from '@json-render/shadcn/catalog';
import { AssistantFormComponentKind } from '#ai-contracts/output/kind';

export class SliderFormComponent extends AssistantFormComponentKind {
  constructor() {
    super({ definition: shadcnComponentDefinitions.Slider, id: 'Slider' });
  }
}
