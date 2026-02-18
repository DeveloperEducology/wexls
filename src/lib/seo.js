export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (!configured) return 'http://localhost:3000';

  const trimmed = configured.trim();
  if (!trimmed) return 'http://localhost:3000';

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function absoluteUrl(pathname = '/') {
  const base = getSiteUrl();
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${normalizedPath}`;
}
