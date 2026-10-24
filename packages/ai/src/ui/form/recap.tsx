import { CheckCircle2, CircleAlert, Sparkles } from '@groam/icons';
import { Heading } from '@groam/ui/components/heading';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import type { BaseComponentProps } from '@json-render/react';

export type RecapProps = {
  highlights: string[];
  summary: string;
  title: string;
  tone: 'default' | 'positive' | 'warning' | null;
};

export function AssistantRecap({ props }: BaseComponentProps<RecapProps>) {
  const tone = props.tone ?? 'default';
  const Icon = tone === 'warning' ? CircleAlert : tone === 'positive' ? CheckCircle2 : Sparkles;
  const toneClass =
    tone === 'warning'
      ? 'border-warning/25 bg-warning/10 text-warning-foreground'
      : tone === 'positive'
        ? 'border-success/25 bg-success/10 text-success-foreground'
        : 'border-border bg-muted/35 text-muted-foreground';

  return (
    <section className={`overflow-hidden rounded-xl border p-4 shadow-xs/5 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-background/70">
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0">
          <Heading level={3} size="sm" className="text-foreground">
            {props.title}
          </Heading>
          <MutedCopy size="xs" className="mt-1">
            {props.summary}
          </MutedCopy>
        </div>
      </div>
      {props.highlights.length > 0 && (
        <ul className="mt-3 grid gap-2 border-t border-current/10 pt-3 text-xs text-foreground/80">
          {props.highlights.map((highlight) => (
            <li className="flex gap-2" key={highlight}>
              <span className="mt-2 size-1 shrink-0 rounded-full bg-current/70" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
