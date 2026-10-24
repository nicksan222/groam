import { defineRule } from 'vite-plus/lint/plugins';
import type { ESTree } from 'vite-plus/lint/plugins';
import { jsxName } from './form-ast.ts';

const DIALOG_MODULES = new Set([
  '@groam/ui/components/alert-dialog',
  '@groam/ui/components/dialog'
]);
const FORM_MODULE = '@groam/ui/components/form';

/** The root of a JSX name: `Modal` for `Modal.Content`. */
function rootName(name: string): string {
  return name.split('.')[0] ?? name;
}

/**
 * A `<Form>` nested inside a Dialog or AlertDialog (any part, under any local alias or as a
 * member such as `Dialog.Content`). Names are resolved from the imports of
 * `@groam/ui/components/dialog`, `.../alert-dialog`, and `.../form`. A form moved into another
 * file cannot be seen from here: keep modal forms on `FormDialog` instead.
 */
export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    const dialogs = new Set<string>();
    const forms = new Set<string>();
    return {
      ImportDeclaration(node) {
        const source = String(node.source.value);
        for (const specifier of node.specifiers) {
          if (DIALOG_MODULES.has(source)) dialogs.add(specifier.local.name);
          else if (
            source === FORM_MODULE &&
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.type === 'Identifier' &&
            specifier.imported.name === 'Form'
          )
            forms.add(specifier.local.name);
        }
      },
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || !forms.has(node.name.name)) return;
        let current = node.parent?.parent as ESTree.Node | null | undefined;
        while (current) {
          if (
            current.type === 'JSXElement' &&
            dialogs.has(rootName(jsxName(current.openingElement.name)))
          ) {
            context.report({
              node,
              message:
                'Use FormDialog from @groam/ui/components/form-dialog for a modal form instead of a Form inside a raw Dialog. It supplies the header, error, Cancel/submit actions, and pending state. If the dialog also hosts non-form content, render that form from its own component. Sheets have no form shell, so Form inside a Sheet is fine.'
            });
            return;
          }
          current = current.parent as ESTree.Node | undefined;
        }
      }
    };
  }
});
