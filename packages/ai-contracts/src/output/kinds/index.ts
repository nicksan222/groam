import { assistantFormComponentIds } from '#ai-contracts/output/ids';
import { AssistantFormComponentKind } from '#ai-contracts/output/kind';
import { AlertFormComponent } from '#ai-contracts/output/kinds/alert';
import { ButtonFormComponent } from '#ai-contracts/output/kinds/button';
import { CardFormComponent } from '#ai-contracts/output/kinds/card';
import { CheckboxFormComponent } from '#ai-contracts/output/kinds/checkbox';
import { HeadingFormComponent } from '#ai-contracts/output/kinds/heading';
import { InputFormComponent } from '#ai-contracts/output/kinds/input';
import { RadioFormComponent } from '#ai-contracts/output/kinds/radio';
import { RecapFormComponent } from '#ai-contracts/output/kinds/recap';
import { SelectFormComponent } from '#ai-contracts/output/kinds/select';
import { SeparatorFormComponent } from '#ai-contracts/output/kinds/separator';
import { SliderFormComponent } from '#ai-contracts/output/kinds/slider';
import { StackFormComponent } from '#ai-contracts/output/kinds/stack';
import { SwitchFormComponent } from '#ai-contracts/output/kinds/switch';
import { TextFormComponent } from '#ai-contracts/output/kinds/text';
import { TextareaFormComponent } from '#ai-contracts/output/kinds/textarea';

AssistantFormComponentKind.subscribe(new AlertFormComponent());
AssistantFormComponentKind.subscribe(new ButtonFormComponent());
AssistantFormComponentKind.subscribe(new CardFormComponent());
AssistantFormComponentKind.subscribe(new CheckboxFormComponent());
AssistantFormComponentKind.subscribe(new HeadingFormComponent());
AssistantFormComponentKind.subscribe(new InputFormComponent());
AssistantFormComponentKind.subscribe(new RadioFormComponent());
AssistantFormComponentKind.subscribe(new RecapFormComponent());
AssistantFormComponentKind.subscribe(new SelectFormComponent());
AssistantFormComponentKind.subscribe(new SeparatorFormComponent());
AssistantFormComponentKind.subscribe(new SliderFormComponent());
AssistantFormComponentKind.subscribe(new StackFormComponent());
AssistantFormComponentKind.subscribe(new SwitchFormComponent());
AssistantFormComponentKind.subscribe(new TextFormComponent());
AssistantFormComponentKind.subscribe(new TextareaFormComponent());

const registered = new Set(AssistantFormComponentKind.all().map((kind) => kind.id));
for (const id of assistantFormComponentIds) {
  if (!registered.has(id)) {
    throw new Error(`Assistant form component '${id}' must be subscribed in kinds/index.ts`);
  }
}
