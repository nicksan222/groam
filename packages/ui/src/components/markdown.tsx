import { cn } from '@groam/ui/lib/utils';
import { Streamdown } from 'streamdown';

// Chat-sized type: Streamdown's defaults are document-sized (h1 is text-3xl).
const chatScale = [
  'text-sm leading-6 text-foreground',
  '[&_[data-streamdown^=heading]]:mt-4 [&_[data-streamdown^=heading]]:mb-1 [&_[data-streamdown^=heading]]:font-semibold',
  '[&_[data-streamdown=heading-1]]:text-base [&_[data-streamdown=heading-2]]:text-base',
  '[&_[data-streamdown=heading-3]]:text-sm [&_[data-streamdown=heading-4]]:text-sm',
  '[&_[data-streamdown=heading-5]]:text-sm [&_[data-streamdown=heading-6]]:text-sm',
  // Hairline quote rule instead of the 4px default.
  '[&_[data-streamdown=blockquote]]:my-2 [&_[data-streamdown=blockquote]]:border-l [&_[data-streamdown=blockquote]]:border-border [&_[data-streamdown=blockquote]]:not-italic',
  '[&_[data-streamdown=link]]:underline-offset-2',
  '[&_[data-streamdown=table-wrapper]]:my-2',
  '[&>*]:my-0 space-y-2'
].join(' ');

/**
 * Markdown for AI-written text: GFM lists, tables, code, and links, tolerant of half-streamed
 * syntax. Links open in a new tab like the rest of chat.
 */
export function Markdown({
  children,
  className,
  streaming = false
}: {
  children: string;
  className?: string;
  /** True while the text is still arriving, so unfinished syntax renders cleanly. */
  streaming?: boolean;
}) {
  return (
    <Streamdown
      className={cn(chatScale, className)}
      controls={{ code: { copy: true, download: false }, table: false }}
      isAnimating={streaming}
      linkSafety={{ enabled: false }}
      mode={streaming ? 'streaming' : 'static'}
    >
      {children}
    </Streamdown>
  );
}
