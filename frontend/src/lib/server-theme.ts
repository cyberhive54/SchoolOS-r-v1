/**
 * server-theme.ts - Server-only theme fetching.
 *
 * Called from Server Components to fetch the school's theme at request time,
 * so the CSS custom properties are included in the initial HTML response
 * (before any JavaScript runs = before first paint).
 */

import type { SchoolTheme } from '@schoolos/types';

const API_PREFIX = '/v1';
const BACKEND_URL = process.env.BACKEND_URL;
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;
const SCHOOL_ID = process.env.NEXT_PUBLIC_SCHOOL_ID ?? '';

function normalizeServerApiBaseUrl(rawValue?: string): string | null {
  if (!rawValue) return null;

  const value = rawValue.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';

    const pathname = url.pathname.replace(/\/+$/, '');
    const normalizedPath = pathname.endsWith(API_PREFIX)
      ? pathname
      : `${pathname}${API_PREFIX}`;

    url.pathname = normalizedPath || API_PREFIX;
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

const BASE_URL = normalizeServerApiBaseUrl(BACKEND_URL)
  ?? normalizeServerApiBaseUrl(PUBLIC_API_URL);

/** Fetch theme server-side (no auth required - public endpoint) */
export async function fetchThemeForServer(): Promise<SchoolTheme | null> {
  if (!SCHOOL_ID || !BASE_URL) return null;

  try {
    const res = await fetch(`${BASE_URL}/school/theme`, {
      headers: {
        'X-School-ID': SCHOOL_ID,
      },
      cache: 'force-cache',
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { data: { theme: SchoolTheme } };
    return data.data.theme;
  } catch {
    return null;
  }
}

/** Build a CSS string from a theme object to inline in <style> tags */
export function buildThemeCss(theme: SchoolTheme | null): string {
  if (!theme) return '';

  const rules: string[] = [];
  if (theme.color_primary) rules.push(`--color-primary: ${theme.color_primary};`);
  if (theme.color_secondary) rules.push(`--color-secondary: ${theme.color_secondary};`);
  if (theme.color_accent) rules.push(`--color-accent: ${theme.color_accent};`);
  if (theme.color_surface) rules.push(`--color-surface: ${theme.color_surface};`);
  if (theme.radius_md) rules.push(`--radius-md: ${theme.radius_md};`);
  if (theme.radius_lg) rules.push(`--radius-lg: ${theme.radius_lg};`);
  if (theme.font_heading)
    rules.push(`--font-heading: '${theme.font_heading}', system-ui, sans-serif;`);
  if (theme.font_body)
    rules.push(`--font-body: '${theme.font_body}', system-ui, sans-serif;`);

  if (rules.length === 0) return '';
  return `:root { ${rules.join(' ')} }`;
}
