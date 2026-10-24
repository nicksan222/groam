import type { ReactNode } from 'react';
import type { PlanCardModel } from '@/types/trip-planner';
import { PlanCard } from './plan-card';
import { PlanCardBody } from './plan-card-body';
import { PlanCardHeader } from './plan-card-header';
import { PlanCardTile } from './plan-card-tile';
import { PlanCardTitle } from './plan-card-title';
import { PlanFact } from './plan-fact';

/** Draws any plan card model with the standard pieces; a strategy decides what is in the model. */
export function PlanCardFromModel({
  action,
  id,
  model
}: {
  /** A control at the end of the header, for example Flag or Edit. */
  action?: ReactNode;
  id?: string;
  model: PlanCardModel;
}) {
  return (
    <PlanCard id={id} kind={model.kind}>
      <PlanCardHeader>
        <PlanCardTile icon={model.icon} />
        <PlanCardTitle label={model.label} meta={model.meta} title={model.title} />
        {action}
      </PlanCardHeader>
      {model.notes || model.facts.length ? (
        <PlanCardBody notes={model.notes}>
          {model.facts.map((fact) => (
            <PlanFact href={fact.href} icon={fact.icon} key={fact.key}>
              {fact.label}
            </PlanFact>
          ))}
        </PlanCardBody>
      ) : null}
    </PlanCard>
  );
}
