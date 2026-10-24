import type { Context, ESTree, Ranged } from 'vite-plus/lint/plugins';

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
