/**
 * The quiet visible "Optional" mark shared by form fields and sections; required ones carry no
 * mark. It sits beside the label, never inside it: the label itself carries " (optional)" for
 * assistive tech, so the field's name reads "Notes (optional)".
 */
export function OptionalMark() {
  return (
    <span aria-hidden className="text-xs font-normal text-muted-foreground">
      Optional
    </span>
  );
}
