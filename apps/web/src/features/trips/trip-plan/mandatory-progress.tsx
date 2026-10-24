import { Progress } from '@groam/ui/components/progress';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

/** How many of the issues every trip needs settled are done: a thin bar and a link on to Issues. */
export function MandatoryProgress({
  done,
  total,
  tripReference
}: {
  done: number;
  total: number;
  /** The trip as links write it; without it the summary is plain text. */
  tripReference?: string;
}) {
  const summary = `${done} of ${total} mandatory done`;
  const text = (
    <>
      <span className="tabular-nums">{done}</span> of <span className="tabular-nums">{total}</span>{' '}
      mandatory done
    </>
  );
  return (
    <div className="flex max-w-60 flex-col gap-2" data-testid={testIds.planMandatoryProgress}>
      <Progress
        aria-label="Mandatory issues"
        aria-valuetext={summary}
        className="h-1.5"
        value={(done / total) * 100}
      />
      {tripReference === undefined ? (
        <span className="text-xs text-muted-foreground">{text}</span>
      ) : (
        <Link
          className="w-fit text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          params={{ section: 'issues', tripId: tripReference }}
          to="/trips/$tripId/$section"
        >
          {text}
        </Link>
      )}
    </div>
  );
}
