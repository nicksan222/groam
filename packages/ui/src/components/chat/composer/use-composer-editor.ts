'use client';

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';
import type { ComponentProps, FormEvent, KeyboardEvent, RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  COMPOSER_CLIPBOARD_TYPE,
  parseComposerClipboard
} from '#src/components/chat/composer/composer-clipboard';
import {
  type ActiveQuery,
  type ComposerItemValue,
  type ComposerPart,
  type ComposerQuery,
  type ComposerSelection,
  type ComposerTokenPart,
  type ComposerTrigger,
  type ComposerValue,
  currentQuery,
  equalValue,
  getComposerText,
  getFilteredItems,
  hasVisibleItems,
  insertItem,
  insertPlainText,
  readSelection,
  readValue,
  restoreSelection,
  writeValue,
  isComposingKey
} from '#src/components/chat/composer/composer-document';
import {
  type ComposerHistory,
  copySelection,
  emptyHistory,
  type HistoryDirection,
  historyInputDirection,
  historyShortcut,
  type PendingInput,
  pasteValue,
  placeCaretAtPoint,
  recordEdit,
  submitsOnEnter
} from '#src/components/chat/composer/composer-editing';

type ComposerChangeDetails = {
  reason: 'input' | 'selection' | 'history' | 'reset';
};
type UseComposerEditorOptions = {
  value: ComposerValue;
  onValueChange: (value: ComposerValue, details: ComposerChangeDetails) => void;
  onSubmit?: (value: ComposerValue) => void;
  onQueryChange?: (query: ComposerQuery | null) => void;
  onAction?: (item: ComposerItemValue, query: ComposerQuery) => void;
  submitOnEmptySuggestions?: boolean;
  triggers?: readonly ComposerTrigger[];
  disabled?: boolean;
  readOnly?: boolean;
  submitDisabled?: boolean;
  allowEmpty?: boolean;
  submitOnEnter?: 'desktop' | 'always' | 'never';
};

type ComposerEditorController = {
  value: ComposerValue;
  inputProps: ComponentProps<'div'>;
  formProps: Pick<ComponentProps<'form'>, 'onSubmit'>;
  rootRef: RefObject<HTMLFormElement | null>;
  isEmpty: boolean;
  isTextarea: boolean;
  isComposing: boolean;
  canSubmit: boolean;
  disabled: boolean;
  readOnly: boolean;
  submit: () => void;
  insertTrigger: (character: string) => void;
  reset: (value?: ComposerValue) => void;
  status: 'ready' | 'loading' | 'error';
  tokenHosts: readonly HTMLSpanElement[];
  suggestions: {
    enabled: boolean;
    submitOnEmptySuggestions: boolean;
    items: readonly ComposerItemValue[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onItemSelect: (item: ComposerItemValue) => void;
  };
};

function plainTextValue(value: ComposerValue): ComposerValue {
  const text = getComposerText(value);
  return text ? [{ type: 'text', text }] : [];
}

export function useComposerEditor({
  value,
  onValueChange,
  onSubmit,
  onQueryChange,
  onAction,
  submitOnEmptySuggestions = false,
  triggers = [],
  disabled = false,
  readOnly = false,
  submitDisabled = false,
  allowEmpty = false,
  submitOnEnter = 'always'
}: UseComposerEditorOptions): ComposerEditorController {
  const inputRef = useRef<HTMLDivElement>(null);
  const [inputElement, setInputElement] = useState<HTMLDivElement | null>(null);
  const setInputRef = useCallback((element: HTMLDivElement | null): void => {
    inputRef.current = element;
    setInputElement(element);
  }, []);
  const isTextarea = inputElement?.tagName === 'TEXTAREA';
  const [initialHistory] = useState(() => emptyHistory(value));
  const history = useRef<ComposerHistory>(initialHistory);
  const pendingInput = useRef<PendingInput>({ type: '', selection: null });
  const lastSelection = useRef<ComposerSelection | null>(null);
  const historyAction = useRef<(direction: HistoryDirection) => void>(() => {});
  const rootRef = useRef<HTMLFormElement>(null);
  const composing = useRef(false);
  const [isComposing, setIsComposing] = useState(false);
  const compositionValue = useRef(value);
  const ignoreCompositionInput = useRef(false);
  const dismissedQuery = useRef<string | null>(null);
  const queryAction = useRef<() => void>(() => {});
  const [query, setQuery] = useState<ActiveQuery | null>(null);
  const [tokenHosts, setTokenHosts] = useState<HTMLSpanElement[]>([]);
  const [, forceReconcile] = useState(0);
  const trigger = triggers.find((item) => item.character === query?.character);
  const { contains } = useComposerFilter();
  const options = getFilteredItems(trigger, query, contains);
  const open =
    !isTextarea &&
    !isComposing &&
    !disabled &&
    !readOnly &&
    Boolean(query) &&
    hasVisibleItems(trigger, options);
  const isEmpty = !getComposerText(value);
  const canSubmit =
    !isComposing &&
    !disabled &&
    !readOnly &&
    !submitDisabled &&
    (allowEmpty || Boolean(getComposerText(value).trim()));
  const onQueryChangeRef = useRef(onQueryChange);
  useLayoutEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  });
  const queryCharacter = query?.character;
  const queryText = query?.text;
  const queryKey = query?.key;

  const syncTokenHosts = useCallback((input: HTMLDivElement): void => {
    const next = Array.from(
      input.querySelectorAll<HTMLSpanElement>('[data-slot="composer-token-renderer"]')
    );
    setTokenHosts((previous) =>
      previous.length === next.length && previous.every((host, index) => host === next[index])
        ? previous
        : next
    );
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react-doctor/no-pass-live-state-to-parent -- DOM selection and IME query state notify the owning suggestion UI after commit, never during render.
    onQueryChangeRef.current?.(
      queryCharacter && queryText !== undefined && queryKey
        ? { character: queryCharacter, text: queryText, key: queryKey }
        : null
    );
  }, [queryCharacter, queryText, queryKey]);

  useEffect(() => {
    if (
      query &&
      (disabled || readOnly || !triggers.some((item) => item.character === query.character))
    )
      // oxlint-disable-next-line react-doctor/no-adjust-state-on-prop-change -- An imperative DOM query must be dismissed when its editor becomes unavailable; re-enabling must not reopen stale suggestions.
      setQuery(null);
  }, [disabled, readOnly, query, triggers]);

  useEffect(() => {
    const input = inputElement;
    if (!input || input instanceof HTMLTextAreaElement) return;
    const beforeInput = (event: InputEvent) => {
      if (event.defaultPrevented) return;
      if (disabled || readOnly || event.inputType.startsWith('format')) {
        event.preventDefault();
        return;
      }
      const direction = historyInputDirection(event.inputType);
      if (direction) {
        event.preventDefault();
        historyAction.current(direction);
        return;
      }
      if (!composing.current) {
        pendingInput.current = { type: event.inputType, selection: readSelection(input) };
      }
    };
    input.addEventListener('beforeinput', beforeInput);
    return () => input.removeEventListener('beforeinput', beforeInput);
  }, [inputElement, disabled, readOnly]);

  useEffect(() => {
    const onSelectionChange = () => {
      const input = inputRef.current;
      if (input && document.activeElement === input && !composing.current) {
        lastSelection.current = readSelection(input);
        queryAction.current();
      }
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  // Writes the owner's draft into the input when they differ, keeping the caret.
  const reconcileInput = (): void => {
    const input = inputRef.current;
    if (!input || composing.current) return;
    const expected = input instanceof HTMLTextAreaElement ? plainTextValue(value) : value;
    if (!equalValue(history.current.current.value, expected)) {
      lastSelection.current = null;
      history.current = emptyHistory(expected);
    }
    if (!equalValue(readValue(input), expected)) {
      const selection = readSelection(input);
      writeValue(input, expected);
      restoreSelection(input, selection);
      setQuery(null);
      dismissedQuery.current = null;
    }
    syncTokenHosts(input);
    if (input instanceof HTMLTextAreaElement) {
      input.disabled = disabled;
      input.readOnly = readOnly;
    }
  };

  // Check each commit, including edits the controlled owner rejects without changing value.
  useLayoutEffect(() => {
    reconcileInput();
  });

  const updateQuery = (): void => {
    const input = inputRef.current;
    const next =
      input &&
      !composing.current &&
      document.activeElement === input &&
      triggers.length > 0 &&
      !disabled &&
      !readOnly &&
      !(input instanceof HTMLTextAreaElement)
        ? currentQuery(input, triggers)
        : null;
    if (!next || next.key !== dismissedQuery.current) dismissedQuery.current = null;
    const active = next?.key === dismissedQuery.current ? null : next;
    setQuery((previous) =>
      previous?.key === active?.key && previous?.node === active?.node ? previous : active
    );
  };

  useLayoutEffect(() => {
    queryAction.current = updateQuery;
  });

  const dismissSuggestions = (): void => {
    dismissedQuery.current = query?.key ?? null;
    setQuery(null);
  };

  const publish = (reason: ComposerChangeDetails['reason'] = 'input'): void => {
    const input = inputRef.current;
    if (!input || composing.current || disabled || readOnly) return;
    const next = readValue(input);
    if (!(input instanceof HTMLTextAreaElement)) {
      if (!equalValue(history.current.current.value, next)) {
        const snapshot = { value: next, selection: readSelection(input) };
        recordEdit(history.current, pendingInput.current, snapshot, reason === 'input');
      }
      pendingInput.current = { type: '', selection: null };
    }
    if (!equalValue(next, value)) onValueChange(next, { reason });
    forceReconcile((revision) => revision + 1);
    syncTokenHosts(input);
    dismissedQuery.current = null;
    updateQuery();
  };

  const selectItem = (suggestion: ComposerItemValue): void => {
    const input = inputRef.current;
    if (
      disabled ||
      readOnly ||
      composing.current ||
      suggestion.disabled ||
      !query ||
      !input?.contains(query.node)
    )
      return;
    pendingInput.current = {
      type: 'selection',
      selection: readSelection(input)
    };
    if (suggestion.type === 'action' && onAction) {
      const range = document.createRange();
      range.setStart(query.node, query.start);
      range.setEnd(query.node, query.end);
      range.deleteContents();
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      publish('selection');
      setQuery(null);
      onAction(suggestion, query);
      return;
    }
    insertItem(input, query, suggestion);
    publish('selection');
    setQuery(null);
  };

  const insertTrigger = (character: string): void => {
    const input = inputRef.current;
    if (
      !input ||
      input instanceof HTMLTextAreaElement ||
      disabled ||
      readOnly ||
      composing.current ||
      !triggers.some((trigger) => trigger.character === character)
    )
      return;
    const text = getComposerText(readValue(input));
    const selection = readSelection(input) ??
      lastSelection.current ?? {
        anchor: text.length,
        focus: text.length
      };
    input.focus({ preventScroll: true });
    restoreSelection(input, selection);
    const start = Math.min(selection.anchor, selection.focus);
    const end = Math.max(selection.anchor, selection.focus);
    const preceding = text.slice(0, start);
    const following = text.slice(end);
    const prefix = preceding && !/\s$/u.test(preceding) ? ' ' : '';
    const suffix = following && !/^\s/u.test(following) ? ' ' : '';
    pendingInput.current = { type: 'trigger', selection: readSelection(input) };
    insertPlainText(input, `${prefix}${character}${suffix}`);
    if (suffix) {
      const caret = start + prefix.length + character.length;
      restoreSelection(input, { anchor: caret, focus: caret });
    }
    publish();
    lastSelection.current = readSelection(input);
  };

  const performHistoryAction = (direction: HistoryDirection) => {
    const input = inputRef.current;
    if (!input || input instanceof HTMLTextAreaElement || disabled || readOnly || composing.current)
      return;
    const state = history.current;
    const source = direction === 'undo' ? state.past : state.future;
    const destination = direction === 'undo' ? state.future : state.past;
    const snapshot = source.pop();
    if (!snapshot) return;
    destination.push({
      value: readValue(input),
      selection: readSelection(input)
    });
    state.current = snapshot;
    state.inputType = '';
    writeValue(input, snapshot.value);
    restoreSelection(input, snapshot.selection);
    onValueChange(snapshot.value, { reason: 'history' });
    forceReconcile((revision) => revision + 1);
    syncTokenHosts(input);
    dismissSuggestions();
  };

  useLayoutEffect(() => {
    historyAction.current = performHistoryAction;
  });

  const performSubmit = (): void => {
    if (!canSubmit || composing.current) return;
    dismissSuggestions();
    onSubmit?.(value);
  };

  const submit = (): void => {
    if (!canSubmit || composing.current) return;
    const root = rootRef.current;
    if (root instanceof HTMLFormElement) root.requestSubmit();
    else performSubmit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (composing.current || isComposingKey(event)) return;
    const direction = historyShortcut(event);
    if (direction) {
      event.preventDefault();
      historyAction.current(direction);
      return;
    }
    if (submitsOnEnter(event, submitOnEnter)) {
      event.preventDefault();
      submit();
    }
  };

  // Editing is blocked, but copying stays available.
  const editingBlocked = (): boolean => disabled || readOnly || composing.current;

  return {
    value,
    isEmpty,
    isTextarea,
    isComposing,
    canSubmit,
    disabled,
    readOnly,
    tokenHosts,
    submit,
    insertTrigger,
    rootRef,
    reset: (next = []) => {
      lastSelection.current = null;
      history.current = emptyHistory(next);
      dismissSuggestions();
      onValueChange(next, { reason: 'reset' });
      forceReconcile((revision) => revision + 1);
    },
    formProps: {
      onSubmit: (event: FormEvent<HTMLFormElement>) => {
        if (event.defaultPrevented || event.target !== event.currentTarget) return;
        event.preventDefault();
        performSubmit();
      }
    },
    inputProps: {
      ref: setInputRef,
      contentEditable: isTextarea ? undefined : !disabled && !readOnly,
      role: 'textbox',
      tabIndex: disabled ? -1 : 0,
      suppressContentEditableWarning: true,
      'aria-disabled': disabled || undefined,
      'aria-readonly': readOnly || undefined,
      'aria-multiline': true,
      onKeyDown,
      onKeyUp: (event) => {
        if (!event.defaultPrevented && !composing.current) updateQuery();
      },
      onClick: updateQuery,
      onBlur: (event) => {
        lastSelection.current = readSelection(event.currentTarget) ?? lastSelection.current;
        dismissSuggestions();
      },
      onInput: () => {
        if (ignoreCompositionInput.current) return;
        publish();
      },
      onCompositionStart: () => {
        pendingInput.current = {
          type: 'composition',
          selection: inputRef.current ? readSelection(inputRef.current) : null
        };
        composing.current = true;
        setIsComposing(true);
        compositionValue.current = value;
        setQuery(null);
      },
      onCompositionEnd: () => {
        composing.current = false;
        setIsComposing(false);
        ignoreCompositionInput.current = true;
        queueMicrotask(() => {
          ignoreCompositionInput.current = false;
        });
        if (equalValue(compositionValue.current, value)) publish();
        forceReconcile((revision) => revision + 1);
      },
      onCopy: (event) => {
        copySelection(event);
      },
      onCut: (event) => {
        const selection = copySelection(event);
        if (!selection || editingBlocked()) return;
        pendingInput.current = { type: 'cut', selection: readSelection(event.currentTarget) };
        selection.getRangeAt(0).deleteContents();
        publish();
      },
      onPaste: (event) => {
        if (event.defaultPrevented || event.currentTarget instanceof HTMLTextAreaElement) return;
        event.preventDefault();
        if (editingBlocked()) return;
        const input = event.currentTarget;
        pendingInput.current = { type: 'paste', selection: readSelection(input) };
        const pastedValue = parseComposerClipboard(
          event.clipboardData.getData(COMPOSER_CLIPBOARD_TYPE)
        );
        if (!pastedValue) insertPlainText(input, event.clipboardData.getData('text/plain'));
        else if (!pasteValue(input, pastedValue)) return;
        publish();
      },
      onDrop: (event) => {
        if (event.defaultPrevented || event.currentTarget instanceof HTMLTextAreaElement) return;
        event.preventDefault();
        if (editingBlocked()) return;
        const input = event.currentTarget;
        const text = event.dataTransfer.getData('text/plain');
        if (!text || !placeCaretAtPoint(input, event.clientX, event.clientY)) return;
        input.focus({ preventScroll: true });
        pendingInput.current = { type: 'drop', selection: readSelection(input) };
        insertPlainText(input, text);
        publish();
      }
    },
    status: trigger?.status ?? 'ready',
    suggestions: {
      submitOnEmptySuggestions,
      enabled: triggers.length > 0 && !isTextarea && !isComposing && !disabled && !readOnly,
      items: options,
      open,
      onOpenChange: (nextOpen) => {
        if (!nextOpen) dismissSuggestions();
      },
      onItemSelect: selectItem
    }
  };
}

export const useComposerFilter: typeof AutocompletePrimitive.useFilter =
  AutocompletePrimitive.useFilter;
export {
  type ComposerChangeDetails,
  type ComposerEditorController,
  type ComposerItemValue,
  type ComposerPart,
  type ComposerQuery,
  type ComposerTokenPart,
  type ComposerTrigger,
  type ComposerValue,
  getComposerText,
  type UseComposerEditorOptions
};
