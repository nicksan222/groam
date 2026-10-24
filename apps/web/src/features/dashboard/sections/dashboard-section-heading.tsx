import { Heading } from '@groam/ui/components/heading';
export function DashboardSectionHeading({
  description,
  id,
  title
}: {
  description?: string;
  id: string;
  title: string;
}) {
  return (
    <div>
      <Heading level={2} size="base" className="tracking-tight text-foreground" id={id}>
        {title}
      </Heading>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
