import { CheckStateIcon } from '@groam/ui/components/check-state-icon';
import { testIds } from '@/lib/test-ids';
import type { PresentedIssueRule, RuleMatch } from '@/types/issues';

const matchWords: Record<RuleMatch, string> = {
  all: 'All of these',
  any: 'Any of these',
  none: 'None of these'
};

function CheckRow({ detail, label, met }: { detail: string | null; label: string; met: boolean }) {
  return (
    <li className="flex items-start gap-2" data-met={met} data-testid={testIds.issueConditionItem}>
      <span className="mt-0.5">
        <CheckStateIcon passed={met} />
      </span>
      <span className="min-w-0 text-xs">
        <span className="block">{label}</span>
        {detail ? <span className="block text-muted-foreground">{detail}</span> : null}
        <span className="sr-only">{met ? ' (met)' : ' (not yet)'}</span>
      </span>
    </li>
  );
}

/**
 * Every condition of a rule checked against the shared trip, with what is still missing. A one-clause
 * rule is its own label, so it shows only what is missing.
 */
/** Keys items by content, numbering repeats, so rows keep identity without array indexes. */
function contentKeys(labels: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return labels.map((label) => {
    const count = seen.get(label) ?? 0;
    seen.set(label, count + 1);
    return count === 0 ? label : `${label}#${count}`;
  });
}

export function IssueRuleBreakdown({ rule }: { rule: PresentedIssueRule }) {
  const [only] = rule.items;
  if (rule.items.length === 1 && only?.kind === 'clause') {
    return only.detail ? <p className="text-xs text-muted-foreground">{only.detail}</p> : null;
  }
  const keys = contentKeys(rule.items.map((item) => `${item.kind}:${item.label}`));
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{matchWords[rule.match]}:</p>
      <ul className="space-y-1.5">
        {rule.items.map((item, index) =>
          item.kind === 'clause' ? (
            <CheckRow detail={item.detail} key={keys[index]} label={item.label} met={item.met} />
          ) : (
            <li
              className="space-y-1.5 rounded-md border border-dashed border-border p-2"
              data-met={item.met}
              data-testid={testIds.issueConditionGroup}
              key={keys[index]}
            >
              <p className="flex items-center gap-2 text-xs font-medium">
                <CheckStateIcon passed={item.met} />
                <span>{matchWords[item.match]}:</span>
                <span className="sr-only">{item.met ? ' (met)' : ' (not yet)'}</span>
              </p>
              <ul className="space-y-1.5 pl-2">
                {item.clauses.map((clause, clauseIndex) => (
                  <CheckRow
                    detail={clause.detail}
                    key={`${clauseIndex}-${clause.label}`}
                    label={clause.label}
                    met={clause.met}
                  />
                ))}
              </ul>
            </li>
          )
        )}
      </ul>
    </div>
  );
}
