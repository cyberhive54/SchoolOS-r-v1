/**
 * ServerThemeInjector — Server Component.
 *
 * Fetches the school's theme on the server and injects it as a <style> tag
 * into the page's <head>. Because this runs during SSR, the CSS variables
 * are present in the initial HTML response — before any JavaScript executes
 * (before first paint).
 *
 * This is the correct Next.js 15 App Router approach for critical CSS.
 */

import { fetchThemeForServer, buildThemeCss } from '@/lib/server-theme';

export async function ServerThemeInjector() {
  const theme = await fetchThemeForServer();
  const css = buildThemeCss(theme);

  if (!css) return null;

  return (
    <style
      id="schoolos-theme"
      // dangerouslySetInnerHTML is safe here — css is built from our own API
      // response with known CSS property names, no user-controlled HTML.
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
}
