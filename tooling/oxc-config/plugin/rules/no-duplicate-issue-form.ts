import { dirname, resolve } from 'node:path';
import { defineRule, type ESTree } from 'vite-plus/lint/plugins';

const hook = '/apps/web/src/features/issues/hooks/use-workspace-issues';
const owners = [
  '/apps/web/src/features/issues/shared/create-issue-dialog.tsx',
  '/apps/web/src/features/trip-queue/queue-add-row.tsx'
];
const message =
  'Reuse CreateIssueDialog (@/features/issues/shared/create-issue-dialog) instead of implementing another issue creation form. Only that dialog and the approved title-only QueueAddRow may use useCreateIssue; only its hook may access the creation endpoint.';

function apiImportName(
  specifier: ESTree.ImportDeclaration['specifiers'][number]
): string | undefined {
  if (specifier.type === 'ImportNamespaceSpecifier') return `${specifier.local.name}.api`;
  if (specifier.type !== 'ImportSpecifier') return;
  const name =
    specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
  return name === 'api' ? specifier.local.name : undefined;
}

function modulePath(source: string, filename: string): string {
  const path = source.startsWith('@/')
    ? `/apps/web/src/${source.slice(2)}`
    : resolve(dirname(filename), source);
  return path.replace(/\.[cm]?[jt]sx?$/u, '');
}

/** Static member paths include bracket notation, but never evaluate computed expressions. */
function memberPath(node: ESTree.Node): string | undefined {
  if (node.type === 'Identifier') return node.name;
  if (node.type !== 'MemberExpression') return;
  const object = memberPath(node.object);
  const property =
    !node.computed && node.property.type === 'Identifier'
      ? node.property.name
      : node.property.type === 'Literal' && typeof node.property.value === 'string'
        ? node.property.value
        : undefined;
  return object && property ? `${object}.${property}` : undefined;
}

/** Protect the existing creation owners; this is an ownership check, not clone detection. */
export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/');
    const mayImportHook = owners.some((owner) => filename.endsWith(owner));
    const mayAccessEndpoint = filename.endsWith(`${hook}.ts`);
    const apiNames = new Map<string, ESTree.ImportDeclaration['specifiers'][number]>();
    const checkModule = (
      node: ESTree.ImportDeclaration | ESTree.ExportNamedDeclaration | ESTree.ExportAllDeclaration
    ) => {
      if (!node.source || mayImportHook) return;
      if (modulePath(String(node.source.value), filename).endsWith(hook))
        context.report({ node: node.source, message });
    };
    return {
      Program(program) {
        for (const node of program.body) {
          if (node.type !== 'ImportDeclaration' || node.source.value !== '@groam/backend/api')
            continue;
          for (const specifier of node.specifiers) {
            const name = apiImportName(specifier);
            if (name) apiNames.set(`${name}.routes.trips.issues.create`, specifier);
          }
        }
      },
      ImportDeclaration(node) {
        checkModule(node);
      },
      ExportNamedDeclaration: checkModule,
      ExportAllDeclaration: checkModule,
      MemberExpression(node) {
        if (mayAccessEndpoint) return;
        // Report at `create`, so using the reference without `.run` is also covered.
        const specifier = apiNames.get(memberPath(node) ?? '');
        if (!specifier) return;
        let scope: ReturnType<typeof context.sourceCode.getScope> | null =
          context.sourceCode.getScope(node);
        while (scope) {
          const binding = scope.set.get(specifier.local.name);
          if (binding) {
            if (binding.defs.some((definition) => definition.node === specifier))
              context.report({ node, message });
            return;
          }
          scope = scope.upper;
        }
      }
    };
  }
});
