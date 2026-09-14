import type { Id } from '@groam/backend/data-model';
import { useState } from 'react';
import { createStore, useStore } from 'zustand';
import type { TripCostSplit } from '@/features/trips/trip-forms/trip-cost';
import {
  type TransferAttachmentDraft as AttachmentDraft,
  type InitialTransfer,
  initialTransferDraft,
  MAX_TRANSFER_ATTACHMENTS,
  type TransferDraft,
  type TransferFormAction,
  type TransferFormState,
  type TransferKind,
  transferCostError,
  transferDraftsMatch,
  transferDurationError,
  transferInputFromDraft,
  transferTimingError,
  tripTransferFormReducer
} from './trip-transfer-form-state';
import type { TransportMode, TripTransferInput } from './use-trips';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type TransferFormStore = TransferFormState & {
  apply: (action: TransferFormAction) => void;
};

function createTripTransferFormStore(baseline: TransferDraft) {
  return createStore<TransferFormStore>()((set) => ({
    apply: (action) =>
      set((state) =>
        tripTransferFormReducer(
          { draft: state.draft, operation: state.operation, status: state.status },
          action
        )
      ),
    draft: baseline,
    operation: 'idle',
    status: null
  }));
}

export function useTripTransferForm({
  initial,
  kind,
  minimumDay,
  onRemove,
  onSave,
  uploadMedia
}: {
  initial: InitialTransfer | null;
  kind: TransferKind;
  minimumDay: number;
  onRemove: () => Promise<boolean>;
  onSave: (input: TripTransferInput) => Promise<boolean>;
  uploadMedia: (file: File, successMessage?: null | string) => Promise<Id<'media'> | null>;
}) {
  const [baseline] = useState(() => initialTransferDraft(initial, kind, minimumDay));
  const [store] = useState(() => createTripTransferFormStore(baseline));
  const state = useStore(store);
  const dispatch = state.apply;
  const costError = transferCostError(state.draft.cost);
  const durationError = transferDurationError(state.draft.duration);
  const timingError = transferTimingError(state.draft);
  const hasChanges = !transferDraftsMatch(state.draft, baseline);
  const isBusy = state.operation !== 'idle';
  const canSave =
    !isBusy &&
    costError === null &&
    durationError === null &&
    timingError === null &&
    (initial === null || hasChanges);

  const save = async () => {
    if (!canSave) {
      const message = costError ?? durationError ?? timingError;
      if (message) dispatch({ status: { kind: 'error', message }, type: 'setStatus' });
      return false;
    }
    dispatch({ operation: 'saving', type: 'setOperation' });
    dispatch({ status: null, type: 'setStatus' });
    try {
      const saved = await onSave(transferInputFromDraft(state.draft));
      if (!saved) {
        dispatch({
          status: {
            kind: 'error',
            message: 'Travel details could not be saved. Your draft is still here.'
          },
          type: 'setStatus'
        });
      }
      return saved;
    } catch {
      dispatch({
        status: {
          kind: 'error',
          message: 'Travel details could not be saved. Your draft is still here.'
        },
        type: 'setStatus'
      });
      return false;
    } finally {
      dispatch({ operation: 'idle', type: 'setOperation' });
    }
  };

  const remove = async () => {
    if (initial === null || isBusy) return false;
    dispatch({ operation: 'removing', type: 'setOperation' });
    dispatch({ status: null, type: 'setStatus' });
    try {
      const removed = await onRemove();
      if (!removed) {
        dispatch({
          status: { kind: 'error', message: 'The travel connection could not be removed.' },
          type: 'setStatus'
        });
      }
      return removed;
    } catch {
      dispatch({
        status: { kind: 'error', message: 'The travel connection could not be removed.' },
        type: 'setStatus'
      });
      return false;
    } finally {
      dispatch({ operation: 'idle', type: 'setOperation' });
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || isBusy) return;
    const availableSlots = Math.max(0, MAX_TRANSFER_ATTACHMENTS - state.draft.attachments.length);
    if (availableSlots === 0) {
      dispatch({
        status: { kind: 'warning', message: 'Remove a file before uploading another.' },
        type: 'setStatus'
      });
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    dispatch({ operation: 'uploading', type: 'setOperation' });
    dispatch({ status: null, type: 'setStatus' });
    try {
      const results = await Promise.all(
        selectedFiles.map(async (file): Promise<AttachmentDraft | null> => {
          try {
            const mediaId = await uploadMedia(file, null);
            return mediaId ? { id: mediaId, name: file.name } : null;
          } catch {
            return null;
          }
        })
      );
      const uploaded = results.filter(
        (attachment): attachment is AttachmentDraft => attachment !== null
      );
      if (uploaded.length > 0) {
        dispatch({ attachments: uploaded, type: 'appendAttachments' });
      }
      const omittedCount = files.length - selectedFiles.length;
      const failedCount = selectedFiles.length - uploaded.length;
      if (omittedCount > 0 || failedCount > 0) {
        const messages = [
          ...(omittedCount > 0
            ? [`${omittedCount} file${omittedCount === 1 ? '' : 's'} exceeded the 5-file limit.`]
            : []),
          ...(failedCount > 0
            ? [`${failedCount} file${failedCount === 1 ? '' : 's'} could not be uploaded.`]
            : [])
        ];
        dispatch({ status: { kind: 'warning', message: messages.join(' ') }, type: 'setStatus' });
      }
    } finally {
      dispatch({ operation: 'idle', type: 'setOperation' });
    }
  };

  return {
    attachments: state.draft.attachments,
    canSave,
    cost: state.draft.cost,
    costError,
    costSplit: state.draft.costSplit,
    duration: state.draft.duration,
    durationError,
    endDay: Number(state.draft.endDay),
    endTime: state.draft.endTime,
    hasChanges,
    isBusy,
    isPending: state.operation === 'saving' || state.operation === 'removing',
    isUploading: state.operation === 'uploading',
    mode: state.draft.mode,
    notes: state.draft.notes,
    remove,
    removeAttachment: (mediaId: Id<'media'>) => dispatch({ mediaId, type: 'removeAttachment' }),
    save,
    setCost: (value: string) => dispatch({ field: 'cost', type: 'changeText', value }),
    setCostSplit: (split: TripCostSplit) => dispatch({ split, type: 'changeSplit' }),
    setDuration: (value: string) => dispatch({ field: 'duration', type: 'changeText', value }),
    setExactTiming: (enabled: boolean) => dispatch({ enabled, type: 'changeTimingEnabled' }),
    setMode: (mode: TransportMode) => dispatch({ mode, type: 'changeMode' }),
    setNotes: (value: string) => dispatch({ field: 'notes', type: 'changeText', value }),
    setTiming: (value: { endDay: number; endTime: string; startDay: number; startTime: string }) =>
      dispatch({ ...value, type: 'changeTiming' }),
    startDay: Number(state.draft.startDay),
    startTime: state.draft.startTime,
    status: state.status,
    timingEnabled: state.draft.timingEnabled,
    timingError,
    uploadFiles
  };
}
