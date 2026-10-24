import { Button } from '@groam/ui/components/button';
import {
  Composer,
  ComposerActionGroup,
  ComposerActions,
  ComposerInput,
  ComposerSubmit,
  getComposerText
} from '@groam/ui/components/composer';
import { useEffect, useRef } from 'react';
import { useThreadMessageEdit } from '@/features/discussions/hooks/use-thread-message-edit';
import { focusComposerEnd } from './composer-caret';

/** Inline plain-text editor for the viewer's own message: Enter saves, Escape cancels. */
export function ThreadMessageEditor({
  authorName,
  mine,
  onCancel,
  onSave,
  text
}: {
  authorName?: string;
  mine: boolean;
  onCancel: () => void;
  onSave: (text: string) => void;
  text: string;
}) {
  const { canSave, draft, setDraft, submit } = useThreadMessageEdit({
    initialText: text,
    onSave
  });
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    focusComposerEnd(inputRef.current);
  }, []);

  return (
    <div className={mine ? 'flex justify-end' : 'flex justify-start'}>
      <div className="w-full max-w-[min(100%,24rem)] space-y-1">
        {!mine && (
          <p className="px-1 text-[10px] font-semibold text-muted-foreground">
            {authorName ?? 'Participant'}
          </p>
        )}
        <Composer
          aria-label="Edit message"
          onSubmit={() => submit()}
          onValueChange={(value) => setDraft(getComposerText(value))}
          submitDisabled={!canSave}
          value={draft ? [{ text: draft, type: 'text' }] : []}
        >
          <ComposerInput
            aria-label="Edit message"
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return;
              event.preventDefault();
              onCancel();
            }}
            ref={inputRef}
          />
          <ComposerActions>
            <ComposerActionGroup align="end">
              <Button onClick={onCancel} size="sm" type="button" variant="ghost">
                Cancel
              </Button>
              <ComposerSubmit render={<Button size="sm" />}>Save</ComposerSubmit>
            </ComposerActionGroup>
          </ComposerActions>
        </Composer>
      </div>
    </div>
  );
}
