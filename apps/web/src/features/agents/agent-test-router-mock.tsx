import type { ReactNode } from 'react';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type RouterLinkProps = {
  children?: ReactNode;
  className?: string;
  params?: Record<string, string>;
  to: string;
};

function resolveRouterHref(to: string, params?: Record<string, string>) {
  let href = to;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      href = href.replace(`$${key}`, value);
    }
  }
  return href;
}

export function createAgentTestRouterMock(
  navigate: () => unknown,
  options?: { preventDefault?: boolean }
) {
  return {
    Link: ({ children, className, params, to }: RouterLinkProps) => (
      <a
        className={className}
        href={resolveRouterHref(to, params)}
        onClick={options?.preventDefault ? (event) => event.preventDefault() : undefined}
      >
        {children}
      </a>
    ),
    useNavigate: () => navigate
  };
}
