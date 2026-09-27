import { assistantFormComponentIds } from '#ai/runtime/output/ids';
import { AssistantFormComponentKind } from '#ai/runtime/output/kind';
import { AlertFormComponent } from '#ai/runtime/output/kinds/alert';
import { ButtonFormComponent } from '#ai/runtime/output/kinds/button';
import { CardFormComponent } from '#ai/runtime/output/kinds/card';
import { CheckboxFormComponent } from '#ai/runtime/output/kinds/checkbox';
import { HeadingFormComponent } from '#ai/runtime/output/kinds/heading';
import { InputFormComponent } from '#ai/runtime/output/kinds/input';
import { RadioFormComponent } from '#ai/runtime/output/kinds/radio';
import { RecapFormComponent } from '#ai/runtime/output/kinds/recap';
import { SelectFormComponent } from '#ai/runtime/output/kinds/select';
import { SeparatorFormComponent } from '#ai/runtime/output/kinds/separator';
import { SliderFormComponent } from '#ai/runtime/output/kinds/slider';
import { StackFormComponent } from '#ai/runtime/output/kinds/stack';
import { SwitchFormComponent } from '#ai/runtime/output/kinds/switch';
import { TextFormComponent } from '#ai/runtime/output/kinds/text';
import { TextareaFormComponent } from '#ai/runtime/output/kinds/textarea';

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
