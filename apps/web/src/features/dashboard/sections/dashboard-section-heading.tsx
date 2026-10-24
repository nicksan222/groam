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
      <h2 className="text-base font-semibold tracking-tight text-foreground" id={id}>
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
