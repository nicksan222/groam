# Chat components

Groam's chat UI, built on the [coss UI chat family](https://coss.com/ui/chat) and the
[coss Composer](https://coss.com/ui/docs/components/composer). The source started from the coss
shadcn registry (`https://coss.com/ui/r/{chat,composer,composer-editor,use-composer-editor,composer-document,composer-clipboard,composer-query}.json`)
and is now owned here like any other Groam component: it is linted, formatted, convention-checked,
and tested with the rest of `packages/ui`.

Apps import the public entrypoints, never these files:

- `@groam/ui/components/chat`: conversation, messages, actions toolbar and its menu items
  (`ChatMessageMenuItem`, `ChatMessageMenuSeparator`), reactions, replies, timeline markers,
  delivery, members, and states.
- `@groam/ui/components/composer`: `Composer` and its parts, plus Groam's `ComposerSend` (coss
  `ComposerSubmit` through the shared Button, with a tooltip and pending state) and
  `ComposerStop` (stop a running reply; coss has no stop control).
- `@groam/ui/components/chat-timeline` and `@groam/ui/components/chat-text-message`: Groam
  compositions of these parts (paged log with date pills; Markdown message with attachments).

Read the upstream [Chat UI integration guide](https://coss.com/ui/docs/chat.md) and
[Composer API](https://coss.com/ui/docs/components/composer) for the composition contracts.

## Layout

- `chat-*.tsx`, `hooks/`, `lib/`: the coss chat family.
- `composer/`: the coss Composer (`composer.tsx`) and its editor engine, plus `composer-send.tsx`
  and `composer-stop.tsx`.
- `primitives/`: the coss Base UI menu, popover, scroll-area, toggle, toolbar, empty, and
  collapsible used only by chat. The app's own Radix primitives stay unchanged.

## Changes from upstream

Reapply these when pulling a newer coss version:

- Imports use Groam aliases: `#src/*`/`#tsx/*` inside the package, `@groam/ui/lib/utils`,
  `@groam/ui/components/{button,tooltip,skeleton}`, and `@groam/icons` instead of `lucide-react`.
- Long functions are split into named helpers to meet Groam's complexity limit, without
  behavior changes: `composer/composer-editing.ts` holds the undo history, keyboard shortcut,
  clipboard, and drop helpers that upstream inlines in `use-composer-editor.ts`;
  `composer-document.ts`, `composer-editor.ts`, `composer-clipboard.ts`,
  `hooks/use-chat-popup-dismissal.ts`, `lib/split-chat-message-preview.ts`, and
  `chat-reply-preview.tsx` are restructured the same way. The editor's per-commit DOM
  reconcile is a named function called from the effect.
- `composer-editor.ts` drops an unused `ComposerQuery` import (fails `noUnusedLocals`).
- `primitives/menu.tsx` keeps only the parts chat uses (no checkbox, radio, link, submenu, or
  shortcut items, which carried inline SVG icons).
- `ChatMessageActionToolbar` accepts `replyTestId` and `moreTestId`, and `ChatReactionPicker`
  accepts `triggerTestId`, for stable test hooks.
- Read receipts use `text-primary` instead of a raw sky palette color.
- Gradient fades use the `chat-*` utilities in `src/styles/globals.css`, which owns gradients.
  They fade into `--chat-surface` (default popover; `ChatTimeline` sets the page background).
- `lib/chat-day.ts` (Groam) labels the date pills `ChatTimeline` inserts between days.

## Provenance and license

The upstream source is published by Cal.com, Inc. in [cosscom/ui](https://github.com/cosscom/ui).
That repository's license file is the GNU Affero General Public License v3.0; the registry items
copied here carry no separate license notice. Keep this attribution, and confirm the license terms
with the owner before distributing builds that include these files.
