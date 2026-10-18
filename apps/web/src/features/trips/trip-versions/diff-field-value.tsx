import { isEmptyDiffField } from '@/features/trips/hooks/version-format';
import { DiffFieldTone } from './diff-field-tone';
import { MediaDiffValue } from './media-diff-value';
import type { VisualDiffField } from './proposal-types';
import { VisualValue } from './visual-value';

export function DiffFieldValue({
  field,
  side
}: {
  field: VisualDiffField;
  side: 'after' | 'before';
}) {
  const content =
    field.display === 'media' ? (
      <MediaDiffValue media={side === 'before' ? field.mediaBefore : field.mediaAfter} />
    ) : (
      <VisualValue format={field.format} value={side === 'before' ? field.before : field.after} />
    );
  return (
    <DiffFieldTone empty={isEmptyDiffField(field, side)} side={side}>
      {content}
    </DiffFieldTone>
  );
}
