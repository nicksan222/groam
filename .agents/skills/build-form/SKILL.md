---
name: build-form
description: >-
  Build or change any Groam form — create/edit dialogs, settings panels, sheets,
  inline "type and press Enter" rows, comment and reply composers. Use whenever
  adding a field, a submit button, a pending/error state, or a length limit, so
  every form shares one set of primitives instead of hand-rolled markup.
---

# Build a form

Every form is assembled from the shared primitives in `packages/ui`. Read each
one's source and test before using it; the props documented there are the API.

| Need | Use |
| --- | --- |
| Modal create/edit form | `@groam/ui/components/form-dialog` (`FormDialog`) |
| Form on a page, sheet, or inline editor | `@groam/ui/components/form` (`Form`) + `FormActions` |
| Cancel + submit buttons | `@groam/ui/components/form-actions` (`FormActions`) |
| Label + control + help + counter + error | `@groam/ui/components/form-field` (`FormField`) |
| Titled group (options, people, an optional rule) | `@groam/ui/components/form-section` (`FormSection`) |
| Pending, double-submit guard, error capture | `@groam/ui/hooks/use-form-submit` (`useFormSubmit`) |
| Pending + guard + error for a non-form async button (retry, stop, rerun) | `@groam/ui/hooks/use-async-action` (`useAsyncAction`) |
| Busy state on any button (spinner, disabled, `aria-busy`, status) | `pending` on `@groam/ui/components/button` (`Button`) |
| Fresh draft on every opening | `@groam/ui/hooks/use-open-session` (`useOpenSession`) |
| Files a form carries (tickets, bookings) | `@groam/ui/components/form-attachments` (`FormAttachments`) |
| Quick-add line in a list, ledger, or lane | `@groam/ui/components/inline-add-row` (`InlineAddRow`) |
| Comment, reply, review feedback | `@groam/ui/components/comment-composer` (`CommentComposer`) |
| "Trip" picker outside a trip | `apps/web/src/features/trips/trip-forms/trip-select-field.tsx` |

## Rules

1. **Submission.** Drive every submit through `useFormSubmit`: pass
   `form.handle(async () => …)` as `onSubmit` and `form.isPending` /
   `form.error` to the shell. A non-form async button uses `useAsyncAction`.
   Do not hand-roll a busy flag (`useState`, `useRef`, or an id) that is set
   before an `await` and cleared after it, nor `try/finally` or
   `event.preventDefault()`. Put validation messages in `form.setError` inside
   the action. Pass `run` a thunk (`run(() => request())`), never a request that
   has already started, so a guarded second call sends nothing. `run` resolves
   to `{ status: 'ok', value } | { status: 'error', error, message } | { status: 'ignored' }`:
   restore a draft on `error` (or a falsy `value`), never on `ignored`.
2. **Fields.** Every labeled control is a `FormField` child. Do not pair a raw
   `Label`/`<label>` with an input. Mark optional fields with `optional` (and
   optional groups with `FormSection optional`); required fields carry no mark —
   pass `required` so assistive tech hears it. Never write "Optional" into copy
   or placeholders. `layout="inline"` is for a switch or checkbox; a settings
   page passes `Form density="settings"`, which lays every field out split with
   rules between them. With `maxLength`, the counter appears by itself near the
   limit (pass `length` only when the value is not the control's string
   `value`). A `Select` child works as is (its trigger receives the id); a
   `RichTextEditor` still needs its own `aria-label`, since a contenteditable
   cannot be named by `<label for>`.
3. **Limits.** Never type a length literal. Import the field's constant from
   the backend domain's leaf `lengths.ts` (search
   `packages/backend/convex/modules/**/lengths.ts`) — the Convex write
   enforces the same constant. Add one there, with backend enforcement, for a
   new field.
4. **Shells.** No bare `<form>` in features: dialogs use `FormDialog`, everything
   else `Form`, `InlineAddRow`, or `CommentComposer`. Button rows are
   `FormActions` — never a hand-built Cancel/submit pair; a destructive action
   beside them goes in `leading`, extra sends in `children`. `Button` defaults
   to `type="button"`; only the submit says `type="submit"`. `Form` skips
   native validation: the form's own checks decide. Pending is `pending` on the
   busy `Button` (`isPending` on `FormActions`, which passes it on): it covers
   the button with a spinner without changing its width, makes it `aria-busy` and
   `aria-disabled` (still focusable; clicks and submits are swallowed), and adds to one
   shared "Working…" status for assistive tech. Never place a
   `<Spinner>` in a button or swap its label for "Saving…".
5. **Reset.** A create dialog starts empty each time it opens. Split it into an
   exported wrapper that calls `useOpenSession(open)` (`@groam/ui/hooks/use-open-session`)
   and renders the stateful form component with `key={session}`. Do not reset
   drafts by hand in `close()` or sync them on `open` changes.
6. **Validation and errors.** Disable submit until required fields are
   valid. A problem with one field shows as that `FormField`'s `error`, under
   it; only failures of the whole submit go to the shell's `error`. Always show
   `form.error` (or the hook's error, falling back to it).
7. **Copy.** Sentence case. Create dialogs say "Create …"/"Start …"; editing a
   saved thing in a dialog says "Save changes"; an inline editor says "Save";
   comments say "Comment"/"Reply". Prompts in placeholders end with "…"
   ("Leave a comment…"); examples start "e.g." without an ellipsis. Do not
   repeat the label in the placeholder. A toast for a failed action is a
   sentence that names the action and ends with the recovery, with a period:
   "Couldn’t stop the run. Try again." Show the thrown message when it is
   readable and use this as the `fallbackError`. Each failure has one owner:
   if the handler you call already toasts, add no second `onError`.
8. **Ids.** Keep using shared test ids (`add-test-id`); `FormDialog` derives
   `${testId}-submit`/`-cancel` unless `submitTestId` is given.

Lint rules enforce the rules above (tests excluded); read the matching definition
when one reports. Scope is `apps/web/src/features` and `packages/ai/src/ui`,
except where noted.

| Rule | Lint rule |
| --- | --- |
| 1 Submission (no busy flag set around an `await`; use `useFormSubmit` or `useAsyncAction`) | `groam/no-hand-rolled-pending` |
| 2 Fields (no raw label, no "optional" copy) | `groam/no-bare-field-label` (`apps/web/src/features` `.tsx` only), `groam/no-optional-copy` |
| 3 Limits | `groam/no-literal-max-length` (`.tsx`) |
| 4 Shells (no bare `<form>`, no `<Form>` inside a `Dialog`/`AlertDialog` in the same file, no "Saving…" copy, no `<Spinner>` in a `Button`) | `groam/no-bare-form` (`.tsx`), `groam/no-form-in-raw-dialog`, `groam/no-pending-copy`, `groam/no-spinner-in-button` |
| 5 Reset (no effect on `open` that resets state) | `groam/no-manual-draft-reset` |

Lint cannot see a `Form` that a dialog renders from another file: moving it
out is not a way around `FormDialog`.

Pattern rules are `tooling/oxc-config/plugin/patterns/*.json`; logic rules are
`tooling/oxc-config/plugin/rules/`. Use `useAsyncAction` for any single async button that is
not a form submit; `useFormSubmit` is built on it.
