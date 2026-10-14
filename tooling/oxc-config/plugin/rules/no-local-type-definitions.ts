import { nodeTextRule } from './source-text.ts';

export default nodeTextRule(
  ['TSTypeAliasDeclaration', 'TSInterfaceDeclaration'],
  /[\s\S]*/,
  'Put type and interface definitions in apps/web/src/types. Use an oxlint-disable-next-line comment only when a definition must stay local.'
);
