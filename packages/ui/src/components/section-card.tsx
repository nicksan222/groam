import { Card, CardContent, CardHeader, CardTitle } from '@groam/ui/components/card';
import type { ReactNode } from 'react';

export type SectionCardProps = {
  action?: ReactNode;
  children: ReactNode;
  title: string;
};

function SectionCard({ action, children, title }: SectionCardProps) {
  return (
    <Card className="gap-0 overflow-hidden py-0 pb-0 md:gap-0 md:pb-0" data-slot="section-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/35 px-4 py-3 md:px-4 md:py-3 [.border-b]:pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="flex flex-col gap-0 p-0 md:px-0">{children}</CardContent>
    </Card>
  );
}

export { SectionCard };
