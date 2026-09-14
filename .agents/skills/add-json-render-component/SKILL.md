---
name: add-json-render-component
description: >-
  Add a component to the Groam assistant JSON-render form catalog. Use when
  the model should emit a new interactive form piece (heading, input, recap,
  etc.) — not for chat bubbles or product pages.
---

# Add a JSON-render form component

This catalog is what the assistant targets when it builds interactive forms.
It is **not** chat UI (`packages/ui/src/ai`) and **not** product views.

## Steps

1. Add the id to `assistantFormComponentIds` in
   `packages/ai-contracts/src/output/ids.ts` (PascalCase, matching `@json-render/shadcn`
   catalog keys when wrapping a stock component).
2. Create `packages/ai-contracts/src/output/kinds/<kebab>.ts` extending
   `AssistantFormComponentKind`.
3. `AssistantFormComponentKind.subscribe(new FooFormComponent())` in
   `packages/ai-contracts/src/output/kinds/index.ts`. The file already asserts every id
   is subscribed.
4. Import the catalog through `@groam/ai-contracts/output`. Prompt instructions should
   use the re-exported component ids, not a parallel list.

```ts
import { shadcnComponentDefinitions } from '@json-render/shadcn/catalog';
import { AssistantFormComponentKind } from '#ai-contracts/output/kind';

export class HeadingFormComponent extends AssistantFormComponentKind {
  constructor() {
    super({ definition: shadcnComponentDefinitions.Heading, id: 'Heading' });
  }
}
```

## Do not

- Register from a second map in the web app.
- Put chat message bubbles here.
- Construct kinds without `subscribe` — callers use the facade, not the map.
