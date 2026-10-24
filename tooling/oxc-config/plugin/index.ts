import { definePlugin } from 'vite-plus/lint/plugins';
import { patternRules } from './patterns.ts';
import agentContextOwner from './rules/agent-context-owner.ts';
import cognitiveComplexity from './rules/cognitive-complexity.ts';
import maxLinesPerFunction from './rules/max-lines-per-function.ts';
import maxLines from './rules/max-lines.ts';
import noDelete from './rules/no-delete.ts';
import noDuplicateIssueForm from './rules/no-duplicate-issue-form.ts';
import noFormInRawDialog from './rules/no-form-in-raw-dialog.ts';
import noHandRolledPending from './rules/no-hand-rolled-pending.ts';
import noManualDraftReset from './rules/no-manual-draft-reset.ts';
import noOptionalCopy from './rules/no-optional-copy.ts';
import noPendingCopy from './rules/no-pending-copy.ts';
import noRawIcons from './rules/no-raw-icons.ts';
import noRawInternalAnchors from './rules/no-raw-internal-anchors.ts';
import noReExportAll from './rules/no-re-export-all.ts';
import noSpinnerInButton from './rules/no-spinner-in-button.ts';
import pageRendersView from './rules/page-renders-view.ts';
import planningPageBody from './rules/planning-page-body.ts';
import shellColumns from './rules/shell-columns.ts';
import useSemanticElements from './rules/use-semantic-elements.ts';
import viewRegistersAgentContext from './rules/view-registers-agent-context.ts';

// Groam-specific guardrails and Biome rules that Oxlint has no built-in equivalent for. Rules that
// only match source text are definitions in patterns/*.json; the rules here need real logic.
export default definePlugin({
  meta: { name: 'groam' },
  rules: {
    ...patternRules,
    'agent-context-owner': agentContextOwner,
    'cognitive-complexity': cognitiveComplexity,
    'max-lines': maxLines,
    'max-lines-per-function': maxLinesPerFunction,
    'no-delete': noDelete,
    'no-duplicate-issue-form': noDuplicateIssueForm,
    'no-form-in-raw-dialog': noFormInRawDialog,
    'no-hand-rolled-pending': noHandRolledPending,
    'no-manual-draft-reset': noManualDraftReset,
    'no-optional-copy': noOptionalCopy,
    'no-pending-copy': noPendingCopy,
    'no-raw-icons': noRawIcons,
    'no-raw-internal-anchors': noRawInternalAnchors,
    'no-re-export-all': noReExportAll,
    'no-spinner-in-button': noSpinnerInButton,
    'page-renders-view': pageRendersView,
    'planning-page-body': planningPageBody,
    'shell-columns': shellColumns,
    'use-semantic-elements': useSemanticElements,
    'view-registers-agent-context': viewRegistersAgentContext
  }
});
