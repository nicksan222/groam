import { FilePenLine } from '@groam/icons';
import { Button } from '@groam/ui/components/button';

export function ResearchNotebookEmpty({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="py-10">
      <FilePenLine aria-hidden className="mb-4 size-6 text-muted-foreground" />
      <h3 className="text-base font-medium">Start with what you know</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Collect useful links, compare your options, and leave notes for the group. The research
        brief keeps everyone focused on the same question.
      </p>
      {onCreate ? (
        <Button className="mt-5" onClick={onCreate} variant="outline">
          Add the first note
        </Button>
      ) : null}
    </div>
  );
}
