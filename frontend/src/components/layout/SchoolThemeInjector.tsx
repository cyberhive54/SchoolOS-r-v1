'use client';

import { useEffect } from 'react';
import { fetchSchoolTheme, injectTheme } from '@/lib/theme';

/**
 * SchoolThemeInjector — fetches and injects per-school CSS variables.
 * Placed in the auth layout root so theme is set before first paint.
 */
export function SchoolThemeInjector() {
  useEffect(() => {
    void (async () => {
      const theme = await fetchSchoolTheme();
      if (theme) injectTheme(theme);
    })();
  }, []);

  return null;
}
