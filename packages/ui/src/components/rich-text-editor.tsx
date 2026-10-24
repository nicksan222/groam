import { Bold, Code, Italic, List, ListOrdered, Strikethrough } from '@groam/icons';
import { cn } from '@groam/ui/lib/utils';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { type Editor, EditorContent, Extension, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { type Ref, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { Button } from './button';

export type RichTextEditorHandle = {
  clear: () => void;
  focus: () => void;
  /** Inserts plain text at the caret (mentions, commands, emoji). */
  insertText: (value: string) => void;
};

export type RichTextEditorProps = {
  'aria-invalid'?: boolean;
  'aria-label': string;
  'aria-required'?: boolean;
  autoFocus?: boolean;
  className?: string;
  /** Classes for the editable surface itself (padding, min/max height, type size). */
  contentClassName?: string;
  disabled?: boolean;
  /** Id for the editable surface, so a visible label can point at it with htmlFor. */
  id?: string;
  /** Most characters of text a person can type (formatting marks not counted). */
  maxLength?: number;
  /** Called with the Markdown source on every change. */
  onChange: (markdown: string) => void;
  onEscape?: () => void;
  /** Enter (or Mod+Enter, see submitShortcut) submits instead of adding a line. */
  onSubmit?: () => void;
  placeholder?: string;
  ref?: Ref<RichTextEditorHandle>;
  submitShortcut?: 'enter' | 'mod-enter';
  testId?: string;
  /** Show the small formatting toolbar; Markdown shortcuts work either way. */
  toolbar?: boolean;
  /** Markdown source. Plain text is valid Markdown, so existing strings load as-is. */
  value: string;
  variant?: 'field' | 'bare';
};

/**
 * Rich text input that reads and writes Markdown, so every stored field stays a plain string.
 * `field` matches Textarea; `bare` drops the frame for composers that draw their own.
 */
export function RichTextEditor({
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
  'aria-required': ariaRequired,
  autoFocus = false,
  className,
  contentClassName,
  disabled = false,
  id,
  maxLength,
  onChange,
  onEscape,
  onSubmit,
  placeholder,
  ref,
  submitShortcut = 'mod-enter',
  testId,
  toolbar = false,
  value,
  variant = 'field'
}: RichTextEditorProps) {
  // Latest callbacks for the keyboard extension, which is created once.
  const handlers = useRef({ onEscape, onSubmit, submitShortcut });
  // Sync after commit; key presses only arrive once the editor is mounted.
  useLayoutEffect(() => {
    handlers.current = { onEscape, onSubmit, submitShortcut };
  }, [onEscape, onSubmit, submitShortcut]);

  const editor = useEditor({
    autofocus: autoFocus ? 'end' : false,
    content: value,
    contentType: 'markdown',
    editable: !disabled,
    editorProps: {
      attributes: {
        'aria-invalid': ariaInvalid ? 'true' : 'false',
        'aria-label': ariaLabel,
        'aria-multiline': 'true',
        ...(ariaRequired ? { 'aria-required': 'true' } : {}),
        ...(id ? { id } : {}),
        class: cn(
          'rich-text min-w-0 outline-none whitespace-pre-wrap [overflow-wrap:anywhere]',
          variant === 'field' && 'min-h-20 px-3 py-2',
          contentClassName
        ),
        ...(testId ? { 'data-testid': testId } : {}),
        role: 'textbox'
      }
    },
    extensions: [
      StarterKit.configure({
        code: { HTMLAttributes: { class: 'rich-text-code' } },
        heading: { levels: [2, 3] },
        link: { autolink: true, openOnClick: false }
      }),
      Markdown,
      Placeholder.configure({
        emptyEditorClass: 'rich-text-placeholder',
        placeholder: placeholder ?? ''
      }),
      CharacterCount.configure({ limit: maxLength ?? null }),
      Extension.create({
        addKeyboardShortcuts() {
          const submit = () => {
            if (!handlers.current.onSubmit) return false;
            handlers.current.onSubmit();
            return true;
          };
          return {
            Enter: ({ editor: current }) => {
              if (handlers.current.submitShortcut !== 'enter') return false;
              // Inside lists and code, Enter keeps its editing meaning.
              if (current.isActive('listItem') || current.isActive('codeBlock')) return false;
              return submit();
            },
            Escape: () => {
              if (!handlers.current.onEscape) return false;
              handlers.current.onEscape();
              return true;
            },
            'Mod-Enter': submit
          };
        },
        name: 'groamSubmit'
      })
    ],
    immediatelyRender: true,
    onUpdate: ({ editor: current }) => onChange(markdownOf(current))
  });

  // Follow outside changes (clear after send, restore on failure) without echoing edits back.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (markdownOf(editor) === value) return;
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    // Silent: toggling editability must not look like an edit to the form.
    editor?.setEditable(!disabled, false);
  }, [disabled, editor]);

  useImperativeHandle(
    ref,
    () => ({
      clear: () => editor?.commands.clearContent(true),
      focus: () => editor?.commands.focus('end'),
      insertText: (text) => editor?.chain().focus().insertContent(text).run()
    }),
    [editor]
  );

  return (
    <div
      className={cn(
        'min-w-0 text-base md:text-sm',
        variant === 'field' &&
          'rounded-lg border border-input bg-background shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24 dark:bg-background',
        variant === 'field' && ariaInvalid && 'border-destructive/36 ring-destructive/20',
        disabled && 'pointer-events-none cursor-not-allowed opacity-64',
        className
      )}
      data-slot="rich-text-editor"
    >
      {toolbar && editor ? <RichTextToolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}

function markdownOf(editor: Editor): string {
  return editor.isEmpty ? '' : editor.getMarkdown().trimEnd();
}

const marks = [
  {
    icon: Bold,
    label: 'Bold',
    mark: 'bold',
    run: (editor: Editor) => editor.chain().focus().toggleBold().run()
  },
  {
    icon: Italic,
    label: 'Italic',
    mark: 'italic',
    run: (editor: Editor) => editor.chain().focus().toggleItalic().run()
  },
  {
    icon: Strikethrough,
    label: 'Strikethrough',
    mark: 'strike',
    run: (editor: Editor) => editor.chain().focus().toggleStrike().run()
  },
  {
    icon: Code,
    label: 'Code',
    mark: 'code',
    run: (editor: Editor) => editor.chain().focus().toggleCode().run()
  },
  {
    icon: List,
    label: 'Bulleted list',
    mark: 'bulletList',
    run: (editor: Editor) => editor.chain().focus().toggleBulletList().run()
  },
  {
    icon: ListOrdered,
    label: 'Numbered list',
    mark: 'orderedList',
    run: (editor: Editor) => editor.chain().focus().toggleOrderedList().run()
  }
] as const;

function RichTextToolbar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      Object.fromEntries(marks.map((item) => [item.mark, current.isActive(item.mark)]))
  });
  return (
    <div
      aria-label="Formatting"
      className="flex items-center gap-1 border-b border-border/70 px-2 py-1"
      role="toolbar"
    >
      {marks.map((item) => (
        <Button
          aria-label={item.label}
          aria-pressed={active[item.mark] ?? false}
          className="size-7 rounded-md text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
          key={item.mark}
          onClick={() => item.run(editor)}
          // Keep the caret in the editor.
          onMouseDown={(event) => event.preventDefault()}
          size="icon"
          title={item.label}
          type="button"
          variant="ghost"
        >
          <item.icon className="size-3.5" />
        </Button>
      ))}
    </div>
  );
}
