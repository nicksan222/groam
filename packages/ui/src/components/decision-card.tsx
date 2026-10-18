import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@groam/ui/components/card';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import type { ReactNode } from 'react';

export type DecisionCardProps = {
  actions: ReactNode;
  description: ReactNode;
  error?: null | string;
  icon: ReactNode;
  title: ReactNode;
};

function DecisionCard({ actions, description, error, icon, title }: DecisionCardProps) {
  return (
    <Card className="w-full max-w-md pb-6" data-slot="decision-card">
      <CardHeader>
        {icon}
        <CardTitle className="text-xl" role="heading" aria-level={1}>
          {title}
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
      </CardHeader>
      {error ? (
        <CardContent>
          <FormFeedback error={error} />
        </CardContent>
      ) : null}
      <CardFooter className="gap-2">{actions}</CardFooter>
    </Card>
  );
}

export { DecisionCard };
