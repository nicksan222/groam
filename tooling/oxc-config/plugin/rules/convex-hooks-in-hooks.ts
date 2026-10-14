import { moduleSourceRule, whole } from './source-text.ts';

export default moduleSourceRule(
  whole(String.raw`[\x22\x27]convex/react[\x22\x27]`),
  'Move Convex React hooks into features/<domain>/hooks and expose feature-focused async state to components.'
);
