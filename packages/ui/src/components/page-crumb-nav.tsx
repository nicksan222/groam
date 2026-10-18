import { Skeleton } from '@groam/ui/components/skeleton';
import { Slot } from '@radix-ui/react-slot';
import { ArrowLeft } from 'lucide-react';
import { cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import { cn } from '#src/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '#tsx/components/breadcrumb';

const parentClassName =
  '-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 font-medium hover:bg-accent hover:text-foreground';
const crumbClassName = 'min-w-0 truncate font-medium hover:text-foreground hover:underline';

export type PageCrumbItem = {
  /** Router `Link` (or other element) merged via `asChild`, same as Button. */
  asChild?: boolean;
  children?: ReactElement;
  href?: string;
  id?: string;
  label: ReactNode;
  onClick?: () => void;
};

export type PageCrumbNavProps = {
  className?: string;
  /** Extra crumbs between the parent and the current page. */
  crumbs?: PageCrumbItem[];
  /** Current page label; rendered as non-interactive text. */
  current?: ReactNode;
  /** Page inset + vertical rhythm (`px-4 sm:px-6 lg:px-8`, `py-2.5 sm:py-3`). */
  inset?: boolean;
  /** Show a skeleton current crumb while the page title loads. */
  isLoading?: boolean;
  parent: PageCrumbItem;
};

/** Compact sticky-header breadcrumb: back chevron, parent, optional crumbs, current page. */
function PageCrumbNav({
  className,
  crumbs = [],
  current,
  inset = true,
  isLoading = false,
  parent
}: PageCrumbNavProps) {
  return (
    <Breadcrumb
      className={cn(
        'min-w-0 text-xs text-muted-foreground',
        inset && 'px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8',
        className
      )}
      data-slot="page-crumb-nav"
    >
      <BreadcrumbList className="min-w-0 gap-x-2 gap-y-1 text-xs sm:gap-x-2 sm:gap-y-1">
        <BreadcrumbItem>
          <CrumbControl isParent item={parent} />
        </BreadcrumbItem>
        {crumbs.map((crumb) => (
          <Fragment key={pageCrumbKey(crumb)}>
            <CrumbSlash />
            <BreadcrumbItem className="min-w-0">
              <CrumbControl item={crumb} />
            </BreadcrumbItem>
          </Fragment>
        ))}
        {isLoading ? (
          <>
            <CrumbSlash />
            <BreadcrumbItem className="min-w-0" data-slot="page-crumb-loading">
              <Skeleton aria-hidden className="h-3 w-28" />
            </BreadcrumbItem>
          </>
        ) : current != null && current !== '' ? (
          <>
            <CrumbSlash />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="min-w-0 truncate font-medium text-muted-foreground">
                {current}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function pageCrumbKey(item: PageCrumbItem) {
  if (item.id) return item.id;
  if (item.href) return item.href;
  if (typeof item.label === 'string' || typeof item.label === 'number') return String(item.label);
  return 'crumb';
}

function CrumbSlash() {
  return <BreadcrumbSeparator className="[&>svg]:hidden">/</BreadcrumbSeparator>;
}

function CrumbControl({ isParent = false, item }: { isParent?: boolean; item: PageCrumbItem }) {
  const className = isParent ? parentClassName : crumbClassName;
  const content = (
    <>
      {isParent ? <ArrowLeft aria-hidden="true" className="size-3.5" /> : null}
      {item.label}
    </>
  );

  if (item.asChild && isValidElement(item.children)) {
    return (
      <Slot className={className} onClick={item.onClick}>
        {cloneElement(item.children, undefined, content)}
      </Slot>
    );
  }

  if (item.href) {
    return (
      <a className={className} href={item.href} onClick={item.onClick}>
        {content}
      </a>
    );
  }

  if (item.onClick) {
    return (
      <button className={className} onClick={item.onClick} type="button">
        {content}
      </button>
    );
  }

  return (
    <span className={isParent ? parentClassName : 'min-w-0 truncate font-medium'}>{content}</span>
  );
}

export { PageCrumbNav };
