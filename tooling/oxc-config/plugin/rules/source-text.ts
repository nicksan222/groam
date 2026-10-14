import { defineRule } from 'vite-plus/lint/plugins';
import type { Context, ESTree, Ranged, Rule } from 'vite-plus/lint/plugins';

type Node = ESTree.Node;
type ModuleWithSource =
  | ESTree.ImportDeclaration
  | ESTree.ExportNamedDeclaration
  | ESTree.ExportAllDeclaration;

/** Reports import/export sources whose quoted text matches, like Grit `JsModuleSource()`. */
export function moduleSourceRule(pattern: RegExp, message: string): Rule {
  return defineRule({
    meta: { type: 'problem' },
    create(context) {
      const check = (node: ModuleWithSource) => {
        if (node.source && sourceMatches(context, node.source, pattern)) {
          context.report({ node: node.source, message });
        }
      };
      return {
        ExportAllDeclaration: check,
        ExportNamedDeclaration: check,
        ImportDeclaration: check
      };
    }
  });
}

/** Reports nodes of the given kinds whose full source text matches the pattern. */
export function nodeTextRule(kinds: readonly string[], pattern: RegExp, message: string): Rule {
  return defineRule({
    meta: { type: 'problem' },
    create(context) {
      const check = (node: Node) => {
        if (sourceMatches(context, node, pattern)) context.report({ node, message });
      };
      return Object.fromEntries(kinds.map((kind) => [kind, check]));
    }
  });
}

/** Matches the whole source text of a node, like a Grit `$node <: r"..."` pattern. */
export function sourceMatches(context: Context, node: Ranged, pattern: RegExp): boolean {
  return pattern.test(context.sourceCode.getText(node));
}

/** Anchors a pattern so it must cover the full node text. */
export function whole(pattern: string): RegExp {
  return new RegExp(`^(?:${pattern})$`, 's');
}

/** Finds JSX attributes anywhere inside a node, like Grit `contains JsxAttribute()`. */
export function containsAttribute(
  node: ESTree.Node,
  predicate: (attribute: ESTree.JSXAttribute | ESTree.JSXSpreadAttribute) => boolean
): boolean {
  const pending: unknown[] = [node];
  while (pending.length > 0) {
    const current = pending.pop();
    if (typeof current !== 'object' || current === null) continue;
    if (Array.isArray(current)) {
      pending.push(...current);
      continue;
    }
    const type: unknown = Reflect.get(current, 'type');
    if (
      (type === 'JSXAttribute' || type === 'JSXSpreadAttribute') &&
      predicate(current as ESTree.JSXAttribute | ESTree.JSXSpreadAttribute)
    ) {
      return true;
    }
    for (const [key, value] of Object.entries(current)) {
      if (key !== 'parent') pending.push(value);
    }
  }
  return false;
}
