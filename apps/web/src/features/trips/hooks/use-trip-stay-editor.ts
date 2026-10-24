import type { Id } from '@groam/backend/data-model';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useCallback, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { useMediaUpload } from '@/features/media/hooks/use-media-upload';
import {
  canSubmitStay,
  stayDraftFor,
  stayInputFromDraft
} from '@/features/trips/hooks/trip-destination-form-state';
import type { TripStayInput } from '@/features/trips/hooks/use-trips';
import type {
  Stay,
  TripStayDestination
} from '@/features/trips/trip-destinations/trip-destination-stays/stay-types';
import { useAsyncPendingState } from '@/lib/stores/async-request-store';
import { createTripStayEditorStore } from '@/lib/stores/trip-stay-editor-store';

export function useTripStayEditor({
  addStay,
  destination,
  updateStay
}: {
  addStay: (destinationId: Id<'tripDestinations'>, input: TripStayInput) => Promise<boolean>;
  destination: TripStayDestination;
  updateStay: (stayId: Id<'tripDestinationStays'>, input: TripStayInput) => Promise<boolean>;
}) {
  const [store] = useState(() => createTripStayEditorStore(stayDraftFor(destination)));
  const draft = useStore(store, (state) => state.draft);
  const editingId = useStore(store, (state) => state.editingId);
  const patchDraft = useStore(store, (state) => state.patchDraft);
  const resetDraft = useStore(store, (state) => state.resetDraft);
  const setEditingId = useStore(store, (state) => state.setEditingId);
  const form = useFormSubmit();
  const uploadPending = useAsyncPendingState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMedia = useMediaUpload();
  const isEditing = editingId !== null;

  const patch = useCallback(
    (value: Partial<typeof draft>) => {
      patchDraft(value);
    },
    [patchDraft]
  );

  const open = useCallback(
    (stay?: Stay) => {
      resetDraft(stayDraftFor(destination, stay));
      setEditingId(stay?.id ?? 'new');
    },
    [destination, resetDraft, setEditingId]
  );

  const close = useCallback(() => setEditingId(null), [setEditingId]);

  /** The save itself, for a form that already runs it through `form.handle`. */
  const submit = async () => {
    if (!canSubmitStay(draft)) return false;
    const input = stayInputFromDraft(draft);
    const saved =
      editingId === 'new'
        ? await addStay(destination.id, input)
        : editingId
          ? await updateStay(editingId, input)
          : false;
    if (saved) setEditingId(null);
    return saved;
  };

  /** Saves on its own, guarded against a double call. Resolves to whether it saved. */
  const save = async () => {
    const outcome = await form.run(submit);
    return outcome.status === 'ok' && outcome.value;
  };

  const uploadFiles = useCallback(
    async (files: FileList | null) => {
      if (
        !files ||
        files.length === 0 ||
        uploadPending.isPending ||
        draft.attachments.length >= 5
      ) {
        return;
      }
      const selected = Array.from(files).slice(0, 5 - draft.attachments.length);
      await uploadPending.run(async () => {
        const uploaded = (
          await Promise.all(
            selected.map(async (file) => {
              const mediaId = await uploadMedia(file, null);
              return mediaId ? { id: mediaId, name: file.name } : null;
            })
          )
        ).filter((item): item is { id: Id<'media'>; name: string } => item !== null);
        if (uploaded.length > 0) {
          patchDraft({
            attachments: [...draft.attachments, ...uploaded].slice(0, 5)
          });
        }
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [draft.attachments, patchDraft, uploadMedia, uploadPending]
  );

  return {
    close,
    draft,
    editingId,
    fileInputRef,
    form,
    isEditing,
    isPending: form.isPending,
    isUploading: uploadPending.isPending,
    open,
    patch,
    save,
    submit,
    uploadFiles
  };
}
