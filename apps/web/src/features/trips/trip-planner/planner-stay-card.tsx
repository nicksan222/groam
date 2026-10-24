import type { ReactNode } from 'react';
import type { Stay } from '@/types/trips';
import { PlanCardFromModel } from './plan-card-from-model';
import { stayOvernightModel } from './plan-kind-strategies';

export function PlannerStayCard({
  action,
  stay,
  destinationName,
  currency
}: {
  /** A control shown beside the title, for example Flag. */
  action?: ReactNode;
  stay: Stay;
  destinationName: string;
  currency: string;
}) {
  return (
    <PlanCardFromModel
      action={action}
      model={stayOvernightModel(stay, destinationName, currency)}
    />
  );
}
