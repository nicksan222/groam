import React from 'react';
import Back from '#tsx/components/shell/components/back';
import ShellBreadcrumb from '#tsx/components/shell/components/breadcrumb';
import Description from '#tsx/components/shell/components/description';
import Title from '#tsx/components/shell/components/title';

type HeaderSlots = {
  breadcrumb: React.ReactNode;
  back: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  rest: React.ReactNode[];
};

const SLOT_TYPE_BY_COMPONENT = new Map<React.ElementType, Exclude<keyof HeaderSlots, 'rest'>>([
  [ShellBreadcrumb, 'breadcrumb'],
  [Back, 'back'],
  [Title, 'title'],
  [Description, 'description']
]);

function classifyHeaderChildren(children: React.ReactNode): HeaderSlots {
  const slots: HeaderSlots = {
    breadcrumb: null,
    back: null,
    title: null,
    description: null,
    rest: []
  };
  for (const child of React.Children.toArray(children)) {
    if (!React.isValidElement(child)) {
      slots.rest.push(child);
      continue;
    }
    const key = SLOT_TYPE_BY_COMPONENT.get(child.type as React.ElementType);
    if (key) slots[key] = child;
    else slots.rest.push(child);
  }
  return slots;
}

function HeaderGroup({ breadcrumb, back, title, description }: Omit<HeaderSlots, 'rest'>) {
  const hasContent = back || title || description;
  if (!breadcrumb && !hasContent) return null;
  return (
    <div className="flex flex-col min-w-0">
      {breadcrumb}
      {hasContent && (
        <div className="flex items-center gap-2">
          {back && <div className="shrink-0 self-stretch flex items-center">{back}</div>}
          <div className="flex flex-col flex-1 min-w-0">
            {title}
            {description && <div className="mt-1">{description}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Always render Breadcrumb → Back → Title → Description, regardless of child order. */
export function groupHeaderChildren(children: React.ReactNode): React.ReactNode[] {
  const slots = classifyHeaderChildren(children);
  const group = (
    <HeaderGroup
      key="header-children-group"
      breadcrumb={slots.breadcrumb}
      back={slots.back}
      title={slots.title}
      description={slots.description}
    />
  );
  return [group, ...slots.rest];
}
