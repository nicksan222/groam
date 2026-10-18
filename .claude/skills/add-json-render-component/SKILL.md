---
name: add-json-render-component
description: >-
  Add a component to the Groam assistant JSON-render form catalog. Use when
  the model should emit a new interactive form or display piece (heading,
  input, recap card, etc.) — not for chat bubbles or product pages.
---

# Add a JSON-render form component

This catalog is what the assistant targets when it emits UI specs. It is
**not** chat UI and **not** product views (`place-ai-ui`,
`place-feature-view`).

## Steps

1. Add the PascalCase id to `assistantFormComponentIds` in
   `packages/ai/src/runtime/output/ids.ts`. Match the `@json-render/shadcn`
   catalog key when wrapping a stock component.
2. Create `packages/ai/src/runtime/output/kinds/<kebab>.ts` extending
   `AssistantFormComponentKind`.
3. Register it with `AssistantFormComponentKind.subscribe(new FooFormComponent())`
   in `packages/ai/src/runtime/output/kinds/index.ts`. That file throws at
   load if any id is not subscribed.
4. Add the renderer under the same id:
   - display pieces → `assistantDisplayStrategies` in
     `packages/ai/src/ui/form/predefined-components.tsx`
   - inputs → `assistantInputStrategies` in
     `packages/ai/src/ui/form/inputs/index.ts` (component + colocated test)
5. Consumers import `@groam/ai/runtime/output` (`assistantFormCatalog`,
   `assistantFormInstructions`); prompts use the exported ids, never a
   parallel list. Run `vp run test`.

## Stock component

```ts
import { shadcnComponentDefinitions } from '@json-render/shadcn/catalog';
import { AssistantFormComponentKind } from '#ai/runtime/output/kind';

export class HeadingFormComponent extends AssistantFormComponentKind {
  constructor() {
    super({ definition: shadcnComponentDefinitions.Heading, id: 'Heading' });
  }
}
```

## Custom component

Give it a `description`, an `example`, and Zod `props` (see `kinds/recap.ts`,
rendered by `packages/ai/src/ui/form/recap.tsx`):

```ts
import * as z from 'zod';
import { AssistantFormComponentKind } from '#ai/runtime/output/kind';

export class RecapFormComponent extends AssistantFormComponentKind {
  constructor() {
    super({
      definition: {
        description: 'A compact recap card for a completed review or plan.',
        example: { highlights: ['3 stops planned'], summary: '…', title: '…', tone: 'positive' },
        props: z.object({
          highlights: z.array(z.string().min(1).max(120)).max(4),
          summary: z.string().min(1).max(360),
          title: z.string().min(1).max(100),
          tone: z.enum(['default', 'positive', 'warning']).nullable()
        })
      },
      id: 'Recap'
    });
  }
}
```

## Do not

- Register components from a second map in the web app.
- Put chat message bubbles here.
- Construct kinds without `subscribe`; callers use the catalog facade.
