// Routing Base-Aware Helpers for GitHub Pages & Custom Subpaths

export const getBaseUrl = (): string => {
  let base = import.meta.env.BASE_URL || '/';
  if (!base.endsWith('/')) base += '/';
  return base;
};

export const getAppPath = (pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/'): string => {
  const base = getBaseUrl();
  let normalized = pathname || '/';
  const baseNoTrailing = base.replace(/\/$/, '');
  if (baseNoTrailing && (normalized === baseNoTrailing || normalized.startsWith(baseNoTrailing + '/'))) {
    normalized = normalized.slice(baseNoTrailing.length);
  }
  if (!normalized || !normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  return normalized;
};

export const toBrowserPath = (appPath: string): string => {
  const base = getBaseUrl();
  const baseNoTrailing = base.replace(/\/$/, '');
  const cleanAppPath = appPath.startsWith('/') ? appPath : `/${appPath}`;
  return `${baseNoTrailing}${cleanAppPath}`;
};
