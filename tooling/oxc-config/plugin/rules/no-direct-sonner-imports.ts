import { moduleSourceRule, whole } from './source-text.ts';

export default moduleSourceRule(
  whole(String.raw`[\x22\x27]sonner[\x22\x27]`),
  "Import toast from @groam/ui/components/toast so the app depends on Groam's UI contract instead of Sonner directly."
);
