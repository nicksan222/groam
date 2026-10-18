import { nodeTextRule, whole } from './source-text.ts';

export default nodeTextRule(
  ['CallExpression'],
  whole(String.raw`(?:window\.)?fetch\s*\(.*`),
  'Move network requests out of TSX components and into a feature hook or focused client adapter.'
);
