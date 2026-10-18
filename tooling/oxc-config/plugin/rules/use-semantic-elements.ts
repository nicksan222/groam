import { defineRule } from 'vite-plus/lint/plugins';
import type { ESTree } from 'vite-plus/lint/plugins';

// Port of Biome a11y/useSemanticElements. Oxlint's jsx-a11y/prefer-tag-over-role also checks
// components and has no role exemptions. Like Biome, this checks DOM elements only and allows
// roles whose semantic elements are impractical. Roles map to their WAI-ARIA base concepts.
// https://github.com/biomejs/biome/blob/main/crates/biome_js_analyze/src/lint/a11y/use_semantic_elements.rs

const EXEMPT_ROLES = new Set(['alert', 'combobox', 'img', 'listbox', 'option', 'status']);

const SEMANTIC_ELEMENTS: Record<string, readonly string[]> = {
  article: ['article'],
  banner: ['header'],
  button: ['button'],
  cell: ['td'],
  checkbox: ['input'],
  columnheader: ['th'],
  complementary: ['aside'],
  contentinfo: ['footer'],
  definition: ['dd'],
  dialog: ['dialog'],
  figure: ['figure'],
  form: ['form'],
  heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  link: ['a', 'area'],
  list: ['ol', 'ul'],
  listitem: ['li'],
  main: ['main'],
  meter: ['meter'],
  navigation: ['nav'],
  paragraph: ['p'],
  progressbar: ['progress'],
  radio: ['input'],
  region: ['section'],
  row: ['tr'],
  rowgroup: ['tbody', 'tfoot', 'thead'],
  rowheader: ['th'],
  searchbox: ['input'],
  separator: ['hr'],
  slider: ['input'],
  spinbutton: ['input'],
  table: ['table'],
  term: ['dfn', 'dt'],
  textbox: ['input', 'textarea'],
  time: ['time']
};

function staticRole(node: ESTree.JSXOpeningElement): string | undefined {
  for (const attribute of node.attributes) {
    if (attribute.type !== 'JSXAttribute' || attribute.name.type !== 'JSXIdentifier') continue;
    if (attribute.name.name !== 'role') continue;
    const value = attribute.value;
    if (value?.type === 'Literal' && typeof value.value === 'string') return value.value;
    if (
      value?.type === 'JSXExpressionContainer' &&
      value.expression.type === 'Literal' &&
      typeof value.expression.value === 'string'
    ) {
      return value.expression.value;
    }
  }
  return undefined;
}

export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    return {
      JSXOpeningElement(node) {
        // Only lowercase DOM elements; components and custom elements are skipped.
        if (node.name.type !== 'JSXIdentifier' || !/^[a-z][a-z0-9]*$/.test(node.name.name)) return;
        const role = staticRole(node);
        if (!role || EXEMPT_ROLES.has(role)) return;
        const elements = SEMANTIC_ELEMENTS[role];
        if (!elements || elements.includes(node.name.name)) return;
        context.report({
          node,
          message: `The element with role="${role}" can be replaced with a semantic element: ${elements.map((element) => `<${element}>`).join(', ')}.`
        });
      }
    };
  }
});
