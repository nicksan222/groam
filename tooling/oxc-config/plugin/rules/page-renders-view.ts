import { defineRule } from 'vite-plus/lint/plugins';
import type { ESTree } from 'vite-plus/lint/plugins';
import {
  descendants,
  importBindings,
  isViewBinding,
  isViewName,
  topLevelFunction
} from './agent-context.ts';
import type { ImportBinding } from './agent-context.ts';

const message =
  "A workspace page renders the feature *View (from a *-view.tsx module) that registers the assistant's screen context, or only redirects with <Navigate>. See the register-agent-screen-context skill.";

function renderedNames(root: unknown): string[] {
  const names: string[] = [];
  for (const node of descendants(root)) {
    if (node.type === 'JSXOpeningElement' && node.name.type === 'JSXIdentifier')
      names.push(node.name.name);
  }
  return names;
}

/** Renders a View, or renders JSX made only of an imported `<Navigate>`. */
function rendersViewOrRedirects(root: unknown, bindings: Map<string, ImportBinding>): boolean {
  const names = renderedNames(root);
  // One page, one view, one screen context.
  const views = new Set(names.filter((name) => isViewBinding(bindings.get(name))));
  if (views.size > 0) return views.size === 1;
  return names.length > 0 && names.every((name) => bindings.get(name)?.imported === 'Navigate');
}

function defaultComponent(program: ESTree.Program): unknown {
  for (const statement of program.body) {
    if (statement.type === 'ExportDefaultDeclaration') {
      const { declaration } = statement;
      return declaration.type === 'Identifier'
        ? topLevelFunction(program, declaration.name)
        : declaration;
    }
    if (statement.type !== 'ExportNamedDeclaration' || statement.source) continue;
    for (const specifier of statement.specifiers) {
      if (specifier.exported.type === 'Identifier' && specifier.exported.name === 'default')
        return topLevelFunction(program, (specifier.local as ESTree.IdentifierName).name);
    }
  }
  return undefined;
}

/** A `export { XView as default } from '…-view'` re-export; undefined when not a re-export. */
function reexportsView(program: ESTree.Program): boolean | undefined {
  for (const statement of program.body) {
    if (statement.type !== 'ExportNamedDeclaration' || !statement.source) continue;
    for (const specifier of statement.specifiers) {
      if (specifier.exported.type !== 'Identifier' || specifier.exported.name !== 'default')
        continue;
      const imported = (specifier.local as ESTree.IdentifierName).name;
      return isViewName(imported) && String(statement.source.value).endsWith('-view');
    }
  }
  return undefined;
}

/** A workspace page that neither renders a feature View nor only redirects. */
export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    return {
      Program(program) {
        const reexport = reexportsView(program);
        const component = defaultComponent(program);
        const ok =
          reexport ??
          (component !== undefined && rendersViewOrRedirects(component, importBindings(program)));
        if (!ok) context.report({ node: program, message });
      }
    };
  }
});
