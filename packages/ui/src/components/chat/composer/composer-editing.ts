import type { ClipboardEvent, KeyboardEvent } from 'react';
import { COMPOSER_CLIPBOARD_TYPE } from '#src/components/chat/composer/composer-clipboard';
import {
  type ComposerSelection,
  type ComposerSnapshot,
  type ComposerValue,
  getComposerText,
  readValue,
  writeValue
} from '#src/components/chat/composer/composer-document';

type HistoryDirection = 'undo' | 'redo';

type ComposerHistory = {
  current: ComposerSnapshot;
  past: ComposerSnapshot[];
  future: ComposerSnapshot[];
  inputType: string;
  timestamp: number;
};

type PendingInput = { type: string; selection: ComposerSelection | null };

const GROUPED_INPUT_TYPES = /^(insertText|deleteContentBackward|deleteContentForward)$/;
const GROUP_WINDOW_MS = 1000;
const MAX_HISTORY = 100;

function emptyHistory(value: ComposerValue): ComposerHistory {
  return {
    current: { value, selection: null },
    past: [],
    future: [],
    inputType: '',
    timestamp: 0
  };
}

/** Typing or deleting in one run, at the same caret, extends the previous undo step. */
function continuesEdit(
  history: ComposerHistory,
  pending: PendingInput,
  grouping: boolean,
  now: number
): boolean {
  const previous = history.current.selection;
  return (
    grouping &&
    GROUPED_INPUT_TYPES.test(pending.type) &&
    history.inputType === pending.type &&
    now - history.timestamp < GROUP_WINDOW_MS &&
    pending.selection?.anchor === previous?.anchor &&
    pending.selection?.focus === previous?.focus
  );
}

/** Records a new draft in the undo history, merging it into the last step when it continues it. */
function recordEdit(
  history: ComposerHistory,
  pending: PendingInput,
  next: ComposerSnapshot,
  grouping: boolean
): void {
  const now = Date.now();
  if (!continuesEdit(history, pending, grouping, now)) {
    history.past.push({ ...history.current, selection: pending.selection });
  }
  if (history.past.length > MAX_HISTORY) history.past.shift();
  history.future = [];
  history.current = next;
  history.inputType = pending.type;
  history.timestamp = now;
}

function historyInputDirection(inputType: string): HistoryDirection | null {
  if (inputType === 'historyUndo') return 'undo';
  if (inputType === 'historyRedo') return 'redo';
  return null;
}

/** Cmd/Ctrl+Z undoes, and Shift+Cmd/Ctrl+Z or Ctrl+Y redoes, in the contenteditable input. */
function historyShortcut(event: KeyboardEvent<HTMLElement>): HistoryDirection | null {
  if (event.currentTarget instanceof HTMLTextAreaElement) return null;
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === 'y' && event.ctrlKey) return 'redo';
  if (key !== 'z') return null;
  return event.shiftKey ? 'redo' : 'undo';
}

function submitsOnEnter(
  event: KeyboardEvent<HTMLElement>,
  submitOnEnter: 'desktop' | 'always' | 'never'
): boolean {
  if (event.key !== 'Enter' || event.shiftKey) return false;
  if (submitOnEnter === 'always') return true;
  return submitOnEnter === 'desktop' && window.matchMedia('(pointer: fine)').matches;
}

/** The current selection when it is a non-empty range inside `root`. */
function selectedRange(root: HTMLElement): Selection | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return null;
  if (!root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null;
  return selection;
}

/** Copies the selected draft as plain text and structured parts; returns the copied selection. */
function copySelection(event: ClipboardEvent<HTMLElement>): Selection | null {
  if (event.defaultPrevented || event.currentTarget instanceof HTMLTextAreaElement) return null;
  const selection = selectedRange(event.currentTarget);
  if (!selection) return null;
  const fragment = document.createElement('div');
  fragment.append(selection.getRangeAt(0).cloneContents());
  const copiedValue = readValue(fragment, false);
  event.clipboardData.setData('text/plain', getComposerText(copiedValue));
  event.clipboardData.setData(COMPOSER_CLIPBOARD_TYPE, JSON.stringify(copiedValue));
  event.preventDefault();
  return selection;
}

/** Inserts structured parts at the caret, keeping tokens; returns false outside the input. */
function pasteValue(root: HTMLElement, value: ComposerValue): boolean {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return false;
  if (!root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return false;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const fragment = document.createElement('div');
  writeValue(fragment, value);
  const nodes = Array.from(fragment.childNodes).filter(
    (node) => !(node instanceof HTMLElement && node.hasAttribute('data-composer-placeholder'))
  );
  const last = nodes.at(-1);
  for (const node of nodes.reverse()) range.insertNode(node);
  if (last) range.setStartAfter(last);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

type CaretDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

function caretFromPoint(x: number, y: number): { node: Node; offset: number } | null {
  const caretDocument = document as CaretDocument;
  const position = caretDocument.caretPositionFromPoint?.(x, y);
  if (position) return { node: position.offsetNode, offset: position.offset };
  const range = caretDocument.caretRangeFromPoint?.(x, y);
  return range ? { node: range.startContainer, offset: range.startOffset } : null;
}

/** Moves the caret to a drop point inside `root`, after any token there; false when outside. */
function placeCaretAtPoint(root: HTMLElement, x: number, y: number): boolean {
  const caret = caretFromPoint(x, y);
  if (!caret || !root.contains(caret.node)) return false;
  const { node, offset } = caret;
  const token = (node instanceof Element ? node : node.parentElement)?.closest(
    '[data-composer-token]'
  );
  const selection = window.getSelection();
  if (!token) {
    selection?.collapse(node, offset);
    return true;
  }
  const afterToken = document.createRange();
  afterToken.setStartAfter(token);
  afterToken.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(afterToken);
  return true;
}

export {
  type ComposerHistory,
  type HistoryDirection,
  type PendingInput,
  copySelection,
  emptyHistory,
  historyInputDirection,
  historyShortcut,
  pasteValue,
  placeCaretAtPoint,
  recordEdit,
  submitsOnEnter
};
