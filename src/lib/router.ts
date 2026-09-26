// Routing Base-Aware Helpers for GitHub Pages & Custom Subpaths

export const getBaseUrl = (): string => {
  let base = import.meta.env.BASE_URL || '/';
  if (!base.endsWith('/')) base += '/';
  return base;
};

export const getAppPath = (pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/'): string => {
  let normalized = pathname || '/';

  // Support spa-github-pages redirect fallback if search contains ?/
  if (typeof window !== 'undefined' && window.location.search && window.location.search.startsWith('?/')) {
    const rawSearch = window.location.search.slice(2);
    const queryRoute = rawSearch.split('&')[0];
    if (queryRoute) {
      normalized = queryRoute.startsWith('/') ? queryRoute : `/${queryRoute}`;
    }
  }

  const base = getBaseUrl();
  const baseNoTrailing = base.replace(/\/$/, '');
  if (baseNoTrailing) {
    if (normalized === baseNoTrailing || normalized.startsWith(baseNoTrailing + '/')) {
      normalized = normalized.slice(baseNoTrailing.length);
    } else if (
      normalized.toLowerCase() === baseNoTrailing.toLowerCase() ||
      normalized.toLowerCase().startsWith(baseNoTrailing.toLowerCase() + '/')
    ) {
      normalized = normalized.slice(baseNoTrailing.length);
    }
  }
  normalized = normalized.replace(/\/+/g, '/');
  if (!normalized || !normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  // Trim trailing slash for consistent route matching (except root '/')
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  // If the browser loaded /index.html directly, normalize to root '/'
  if (normalized === '/index.html') {
    normalized = '/';
  }
  return normalized;
};

export const toBrowserPath = (appPath: string): string => {
  const base = getBaseUrl();
  const baseNoTrailing = base.replace(/\/$/, '');
  const cleanAppPath = appPath.startsWith('/') ? appPath : `/${appPath}`;
  return `${baseNoTrailing}${cleanAppPath}`;
};
