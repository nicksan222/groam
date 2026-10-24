/** The dialog surface of a command-style picker: the Ctrl+K palette and a list's filter share it. */
export const COMMAND_DIALOG_CLASS_NAME =
  'top-[max(1rem,env(safe-area-inset-top))] translate-y-0 gap-0 overflow-hidden p-0 shadow-lg sm:top-[12vh] sm:max-w-xl';

/** The input row: icon, borderless field, and the Esc key cap. Its icon and gap put text at 44px. */
export const COMMAND_INPUT_ROW_CLASS_NAME = 'flex items-center gap-3 border-b px-4';

/**
 * The borderless field that fills `COMMAND_INPUT_ROW_CLASS_NAME`. 16px on phones so iOS does not
 * zoom; `md:text-[15px]` outranks the base input's `md:text-sm`.
 */
export const COMMAND_INPUT_CLASS_NAME =
  'h-12 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:text-[15px] dark:bg-transparent';

/** The footer bar under the results, holding key hints; same 16px gutter as the input row. */
export const COMMAND_FOOTER_CLASS_NAME =
  'flex h-9 items-center gap-4 border-t bg-muted/40 px-4 text-[11px] text-muted-foreground';

/** The heading over a group of options; add the left padding that fits the rows below it. */
export const COMMAND_GROUP_HEADING_CLASS_NAME =
  'px-2 pt-2 pb-1 text-[11px] font-medium text-muted-foreground';

/** An option row in the results; pair with `MenuRow density="popover"`. */
export const COMMAND_OPTION_CLASS_NAME =
  'h-10 gap-3 py-0 text-foreground outline-none transition-colors duration-100 hover:bg-transparent';

/** The highlighted option. */
export const COMMAND_OPTION_ACTIVE_CLASS_NAME = 'bg-accent text-accent-foreground hover:bg-accent';
