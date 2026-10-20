---
name: add-json-render-component
description: >-
  Add a component to the Groam assistant JSON-render form catalog. Use when
  the model should emit a new interactive form or display piece (heading,
  input, recap card, etc.) — not for chat bubbles or product pages.
---

# Add a JSON-render form component

The output catalog defines UI specs emitted by the product assistant. Chat
chrome belongs in `packages/ai/src/ui`; product views belong in web features.

1. Read `packages/ai/src/runtime/output/ids.ts`, `kind.ts`, and `kinds/index.ts`
   for the current registration contract and completeness checks.
2. Follow a comparable stock kind or `kinds/recap.ts` for a custom definition.
   Inspect installed package types for stock catalog keys; derive props,
   descriptions, and examples from the intended component rather than copying
   another component's schema or enum values.
3. Find `assistantDisplayStrategies` and `assistantInputStrategies` under
   `packages/ai/src/ui/form/` and add the matching renderer in the appropriate
   registry. Cover input behavior with a colocated component test.
4. Follow `packages/ai/src/runtime/output/index.test.ts` for catalog consistency
   checks, then run the relevant package tests from its manifest.

Register through the existing kind subscription and catalog facade. Prompts
consume exported catalog instructions/ids; do not create another web-app map or
hardcoded list of supported components.
