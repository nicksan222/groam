import type { Icon } from '@groam/icons';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { IconTile } from '@groam/ui/components/icon-tile';
import { OptionalMark } from '@groam/ui/components/optional-mark';
import { cn } from '@groam/ui/lib/utils';
import { type ReactNode, use } from 'react';
import { FormSectionDepthContext } from '#src/components/form-context';

/**
 * A titled group of controls inside a form (poll options, people to invite, an optional rule).
 * Renders a `fieldset` whose `legend` names the group for assistive tech. A section inside
 * another section reads as a quieter sub-group.
 */
export type FormSectionProps = {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  error?: null | string;
  /** Quiet status on the title's right, e.g. "3 selected". */
  hint?: ReactNode;
  /** A tile beside the title for the big sections of a long form (Where, When, Money). */
  icon?: Icon;
  legend: string;
  /** Marks the whole group "Optional", exactly like an optional field. */
  optional?: boolean;
  /** Draws a rule above the group to set it apart from the fields before it. */
  separated?: boolean;
};

/** The standard grouped-fields block for every form. */
function FormSection({
  children,
  className,
  description,
  error,
  hint,
  icon: SectionIcon,
  legend,
  optional = false,
  separated = false
}: FormSectionProps) {
  const depth = use(FormSectionDepthContext);
  const nested = depth > 0;
  const title = (
    <div className="flex items-baseline justify-between gap-3">
      <span className="flex items-baseline gap-2">
        <span
          aria-hidden
          className={cn(
            nested
              ? 'text-xs font-medium text-muted-foreground'
              : SectionIcon
                ? 'text-sm font-semibold tracking-tight'
                : 'text-sm font-medium'
          )}
        >
          {legend}
        </span>
        {/* The legend carries "(optional)" for assistive tech; this is the visible mark. */}
        {optional ? <OptionalMark /> : null}
      </span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
  return (
    <fieldset
      className={cn(
        'grid min-w-0',
        SectionIcon ? 'gap-3' : 'gap-2',
        separated && 'border-t border-border/70 pt-6',
        className
      )}
      data-slot="form-section"
    >
      {/* A legend cannot be laid out reliably, so a visible copy sits beside it. */}
      <legend className="sr-only">
        {legend}
        {optional ? ' (optional)' : ''}
      </legend>
      {SectionIcon ? (
        <div className="mb-1 grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3">
          <IconTile aria-hidden size="sm">
            <SectionIcon className="size-3.5" />
          </IconTile>
          <div className="space-y-1 pt-1">
            {title}
            {description ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          {title}
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </>
      )}
      <FormSectionDepthContext value={depth + 1}>{children}</FormSectionDepthContext>
      <FormFeedback error={error} />
    </fieldset>
  );
}

export { FormSection };
