import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react/schema';
import * as z from 'zod';
import { assistantFormComponentIds } from '#ai-contracts/output/ids';
import { AssistantFormComponentKind } from '#ai-contracts/output/kind';
import '#ai-contracts/output/kinds/index';

export type { AssistantFormComponentId } from '#ai-contracts/output/ids';
export { assistantFormComponentIds } from '#ai-contracts/output/ids';

export const assistantFormCatalog = defineCatalog(schema, {
  actions: {
    submitForm: {
      description:
        'Submit the current form values to the traveler’s conversation. Use this on exactly one final submit button.',
      params: z.object({
        values: z.record(z.string(), z.unknown())
      })
    }
  },
  components: AssistantFormComponentKind.catalogComponents() as never
});

if (
  assistantFormCatalog.componentNames.some(
    (component) => !assistantFormComponentIds.some((allowed) => allowed === component)
  ) ||
  assistantFormCatalog.componentNames.length !== assistantFormComponentIds.length
) {
  throw new Error('Assistant form catalog and safe component ids must stay in sync');
}

export const assistantFormInstructions = assistantFormCatalog.prompt({
  customRules: [
    'Use a compact UI spec whenever it makes a completed review, plan, recommendation, or traveler choice easier to scan. Keep ordinary short acknowledgements as text.',
    'For a completed review, plan, or recommendation, prefer one Recap card over a long list of plain-text bullets. Include a concise summary and two to four verified highlights.',
    'Do not use choices to ask for exploratory feedback or approval. Finish the work first, then use a form only when one or two traveler decisions are required to execute or refine the next iteration.',
    'Forms must be compact enough for a narrow chat panel. Use one Card root and one vertical Stack; never nest Card inside Card and never use horizontal layouts for fields.',
    'Put every editable value below /form in state and bind each field with $bindState. Initialize every bound value with a /state/form patch.',
    'When a spec accepts a response, end it with exactly one Button whose on.press action is submitForm with params.values set to {"$state":"/form"}. A recap without choices must not include a submit Button.',
    'Use Radio for up to two short required decisions, Select for longer lists, and Input or Textarea only when free text is genuinely needed.',
    'Ask for the minimum information needed. Keep titles, descriptions, labels, and options concise.',
    'Never request passwords, payment details, government identifiers, or other sensitive personal information.'
  ],
  mode: 'inline',
  system:
    'You can render a polished interactive form when Groam needs structured traveler input. These instructions apply only to those forms.'
});
