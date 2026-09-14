import type { Id } from '@groam/backend/data-model';
import { useRef, useState } from 'react';
import { createStore, useStore } from 'zustand';
import { useMediaUpload } from '@/features/media/hooks/use-media-upload';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import {
  type ActivityAttachmentDraft,
  type ActivityFormState,
  activityFormForEdit,
  activityInputFromForm,
  canSubmitTripActivity,
  emptyActivityForm,
  type TripActivity,
  type TripDestinationWithActivities
} from './trip-activity-form-state';
import type { TripDestinationActivityInput } from './use-trips';

export type {
  TimeBlock,
  TripActivity,
  TripDestinationWithActivities
} from './trip-activity-form-state';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type ActivityEditorStore = ActivityFormState & {
  patch: (partial: Partial<ActivityFormState>) => void;
  setUploadMessage: (message: string | null) => void;
  uploadMessage: string | null;
};

function createTripActivityEditorStore(
  destination: TripDestinationWithActivities,
  initial?: Partial<ActivityFormState>
) {
  return createStore<ActivityEditorStore>()((set) => ({
    ...emptyActivityForm(destination),
    ...initial,
    patch: (partial) => set((state) => ({ ...state, ...partial })),
    setUploadMessage: (uploadMessage) => set({ uploadMessage }),
    uploadMessage: null
  }));
}

export function useTripActivityEditor({
  addActivity,
  initial,
  currency,
  destination,
  tripDayCount,
  tripStartDate,
  updateActivity
}: {
  initial?: Partial<ActivityFormState>;
  addActivity: (
    destinationId: Id<'tripDestinations'>,
    input: TripDestinationActivityInput
  ) => Promise<boolean>;
  currency: string;
  destination: TripDestinationWithActivities;
  tripDayCount: number;
  tripStartDate: null | string;
  updateActivity: (
    activityId: Id<'tripDestinationActivities'>,
    input: TripDestinationActivityInput
  ) => Promise<boolean>;
}) {
  const [store] = useState(() => createTripActivityEditorStore(destination, initial));
  const form = useStore(store);
  const savePending = useAsyncPending();
  const uploadPending = useAsyncPending();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMedia = useMediaUpload();
  const isPending = savePending.isPending;
  const isUploading = uploadPending.isPending;
  const firstDay = destination.startDay ?? 1;
  const lastDay =
    destination.endDay ??
    Math.max(
      firstDay,
      tripDayCount,
      ...destination.activities.map((activity) => activity.endDayNumber)
    );
  const dayOptions = Array.from({ length: lastDay - firstDay + 1 }, (_, index) => firstDay + index);

  const reset = () => {
    form.patch(emptyActivityForm(destination));
    form.setUploadMessage(null);
  };

  const openNew = () => {
    form.patch({ ...emptyActivityForm(destination), isOpen: true });
    form.setUploadMessage(null);
  };

  const edit = (activity: TripActivity) => {
    form.patch(activityFormForEdit(activity));
    form.setUploadMessage(null);
  };

  const submit = async () => {
    if (!canSubmitTripActivity({ ...form, isPending, isUploading })) return false;
    const input = activityInputFromForm(form);
    const saved = await savePending.run(async () =>
      form.editingId
        ? await updateActivity(form.editingId, input)
        : await addActivity(destination.id, input)
    );
    if (saved) reset();
    return saved ?? false;
  };

  const uploadAttachments = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0 || isPending || isUploading) return;
    const availableSlots = Math.max(0, 5 - form.attachments.length);
    if (availableSlots === 0) {
      form.setUploadMessage('Remove a file before uploading another.');
      return;
    }
    const selected = Array.from(files).slice(0, availableSlots);
    form.setUploadMessage(null);
    await uploadPending.run(async () => {
      const uploaded = (
        await Promise.all(
          selected.map(async (file): Promise<ActivityAttachmentDraft | null> => {
            try {
              const mediaId = await uploadMedia(file, null);
              return mediaId ? { id: mediaId, name: file.name } : null;
            } catch {
              return null;
            }
          })
        )
      ).filter((attachment): attachment is ActivityAttachmentDraft => attachment !== null);
      if (uploaded.length > 0) {
        form.patch({ attachments: [...store.getState().attachments, ...uploaded] });
      }
      const omitted = files.length - selected.length;
      const failed = selected.length - uploaded.length;
      if (omitted > 0 || failed > 0) {
        form.setUploadMessage(
          [
            ...(omitted > 0 ? [`${omitted} exceeded the five-file limit.`] : []),
            ...(failed > 0 ? [`${failed} could not be uploaded.`] : [])
          ].join(' ')
        );
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return {
    ...form,
    currency,
    dayOptions,
    destinationId: destination.id,
    edit,
    fileInputRef,
    isPending,
    isUploading,
    openNew,
    patch: form.patch,
    removeAttachment: (mediaId: Id<'media'>) =>
      form.patch({
        attachments: store.getState().attachments.filter(({ id }) => id !== mediaId)
      }),
    reset,
    submit,
    tripStartDate,
    uploadAttachments,
    uploadMessage: form.uploadMessage
  };
}

export type { TripActivityEditor } from '@/types/trips';
