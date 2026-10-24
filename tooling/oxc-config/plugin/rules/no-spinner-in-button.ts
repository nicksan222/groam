import { defineRule } from 'vite-plus/lint/plugins';
import type { ESTree } from 'vite-plus/lint/plugins';
import { isFunction, jsxName } from './form-ast.ts';

const BUTTONS = new Set(['Button', 'AlertDialogAction', 'DialogClose']);

/** A `<Spinner>` inside a `<Button>`: the busy state is `Button`'s `pending` prop. */
export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (jsxName(node.name) !== 'Spinner') return;
        let current = node.parent as ESTree.Node | null | undefined;
        while (current && !isFunction(current)) {
          if (current.type === 'JSXElement' && BUTTONS.has(jsxName(current.openingElement.name))) {
            context.report({
              node,
              message:
                'Do not place a Spinner inside a Button. Pass `pending` to the Button (FormActions takes `isPending`; for an AlertDialogAction render `<AlertDialogAction asChild><Button pending>`): it covers the button with a spinner without changing its width, disables it, sets aria-busy, and announces a status (see the build-form skill).'
            });
            return;
          }
          current = current.parent as ESTree.Node | undefined;
        }
      }
    };
  }
});
