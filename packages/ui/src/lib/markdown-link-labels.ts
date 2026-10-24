export type MarkdownNode = {
  type: string;
  tagName?: string;
  children?: MarkdownNode[];
  value?: string;
};

/** Keep HTML snippets in citation labels literal before rehype-raw parses them. */
export function literalLinkLabels() {
  return (tree: MarkdownNode) => {
    function visit(node: MarkdownNode, insideLink = false) {
      const link = insideLink || node.tagName === 'a';
      if (link && node.type === 'raw') node.type = 'text';
      for (const child of node.children ?? []) visit(child, link);
    }
    visit(tree);
  };
}
