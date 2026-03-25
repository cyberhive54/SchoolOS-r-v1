/**
 * theme.ts — injects CSS custom properties from the school's theme
 * into the document's <style> tag before first paint.
 *
 * Called by SchoolThemeInjector component on app init.
 */

import type { SchoolTheme } from '@schoolos/types';

const BASE_URL = '/v1';

export async function fetchSchoolTheme(): Promise<SchoolTheme | null> {
  try {
    const res = await fetch(`${BASE_URL}/school/theme`, {
      credentials: 'include',
      // Must not cache — theme can change
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json() as { data: { theme: SchoolTheme } };
    return data.data.theme;
  } catch {
    return null;
  }
}

export function injectTheme(theme: SchoolTheme): void {
  const existing = document.getElementById('schoolos-theme');
  const style = existing ?? document.createElement('style');
  style.id = 'schoolos-theme';

  style.textContent = `
    :root {
      ${theme.color_primary ? `--color-primary: ${theme.color_primary};` : ''}
      ${theme.color_secondary ? `--color-secondary: ${theme.color_secondary};` : ''}
      ${theme.color_accent ? `--color-accent: ${theme.color_accent};` : ''}
      ${theme.color_surface ? `--color-surface: ${theme.color_surface};` : ''}
      ${theme.radius_md ? `--radius-md: ${theme.radius_md};` : ''}
      ${theme.radius_lg ? `--radius-lg: ${theme.radius_lg};` : ''}
      ${theme.font_heading ? `--font-heading: '${theme.font_heading}', system-ui, sans-serif;` : ''}
      ${theme.font_body ? `--font-body: '${theme.font_body}', system-ui, sans-serif;` : ''}
    }
  `;

  if (!existing) {
    document.head.appendChild(style);
  }
}
