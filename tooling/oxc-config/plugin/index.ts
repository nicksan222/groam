import { definePlugin } from 'vite-plus/lint/plugins';
import cognitiveComplexity from './rules/cognitive-complexity.ts';
import convexHooksInHooks from './rules/convex-hooks-in-hooks.ts';
import maxLinesPerFunction from './rules/max-lines-per-function.ts';
import maxLines from './rules/max-lines.ts';
import noDelete from './rules/no-delete.ts';
import noDirectSonnerImports from './rules/no-direct-sonner-imports.ts';
import noDirectWebStorage from './rules/no-direct-web-storage.ts';
import noFetchInComponents from './rules/no-fetch-in-components.ts';
import noLocalTypeDefinitions from './rules/no-local-type-definitions.ts';
import noNativeBrowserDialogs from './rules/no-native-browser-dialogs.ts';
import noNativeInteractiveElements from './rules/no-native-interactive-elements.ts';
import noNestedPlanningPageBody from './rules/no-nested-planning-page-body.ts';
import noRawInternalAnchors from './rules/no-raw-internal-anchors.ts';
import noRawLocatorTestIds from './rules/no-raw-locator-test-ids.ts';
import noRawTestIds from './rules/no-raw-test-ids.ts';
import noReExportAll from './rules/no-re-export-all.ts';
import planningPageBody from './rules/planning-page-body.ts';
import scopedDescendantVariants from './rules/scoped-descendant-variants.ts';
import shellColumns from './rules/shell-columns.ts';
import useSemanticElements from './rules/use-semantic-elements.ts';

// Groam-specific guardrails and Biome rules that Oxlint has no built-in equivalent for.
export default definePlugin({
  meta: { name: 'groam' },
  rules: {
    'cognitive-complexity': cognitiveComplexity,
    'convex-hooks-in-hooks': convexHooksInHooks,
    'max-lines': maxLines,
    'max-lines-per-function': maxLinesPerFunction,
    'no-delete': noDelete,
    'no-direct-sonner-imports': noDirectSonnerImports,
    'no-direct-web-storage': noDirectWebStorage,
    'no-fetch-in-components': noFetchInComponents,
    'no-local-type-definitions': noLocalTypeDefinitions,
    'no-native-browser-dialogs': noNativeBrowserDialogs,
    'no-native-interactive-elements': noNativeInteractiveElements,
    'no-nested-planning-page-body': noNestedPlanningPageBody,
    'no-raw-internal-anchors': noRawInternalAnchors,
    'no-raw-locator-test-ids': noRawLocatorTestIds,
    'no-raw-test-ids': noRawTestIds,
    'no-re-export-all': noReExportAll,
    'planning-page-body': planningPageBody,
    'scoped-descendant-variants': scopedDescendantVariants,
    'shell-columns': shellColumns,
    'use-semantic-elements': useSemanticElements
  }
});
