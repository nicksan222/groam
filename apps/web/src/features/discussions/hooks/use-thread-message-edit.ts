import { type FormEvent, type KeyboardEvent, useCallback, useRef, useState } from 'react';

export function useThreadMessageEdit({
  initialText,
  onCancel,
  onSave
}: {
  initialText: string;
  onCancel: () => void;
  onSave: (text: string) => void;
}) {
  const [draft, setDraftState] = useState(initialText);
  const draftRef = useRef(initialText);
  const setDraft = useCallback((value: string) => {
    draftRef.current = value;
    setDraftState(value);
  }, []);
  const trimmed = draft.trim();
  const canSave = trimmed.length > 0;

  const submit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      const content = draftRef.current.trim();
      if (!content) return;
      onSave(content);
    },
    [onSave]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      const content = draftRef.current.trim();
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && content) {
        event.preventDefault();
        onSave(content);
      }
    },
    [onCancel, onSave]
  );

  return {
    canSave,
    draft,
    onKeyDown,
    setDraft,
    submit,
    trimmed
  };
}

export function useThreadMessageEditing() {
  const [editing, setEditing] = useState(false);
  const startEditing = useCallback(() => setEditing(true), []);
  const stopEditing = useCallback(() => setEditing(false), []);
  return { editing, setEditing, startEditing, stopEditing };
}
