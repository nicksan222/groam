export const appPath = '/';

export function appHref(path: string): string {
  const normalized = path.replace(/^\//u, '');
  return `${appPath}${normalized}`;
}
