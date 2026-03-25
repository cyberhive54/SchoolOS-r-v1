import type { NextConfig } from 'next';

const API_PREFIX = '/v1';

function normalizeUrl(rawValue?: string): string | null {
  if (!rawValue) return null;

  const value = rawValue.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    const pathname = url.pathname.replace(/\/+$/, '');
    url.pathname = pathname || '/';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function toBackendBaseUrl(rawValue?: string): string | null {
  const normalized = normalizeUrl(rawValue);
  if (!normalized) return null;

  const url = new URL(normalized);
  if (url.pathname === API_PREFIX) {
    url.pathname = '/';
    return url.toString().replace(/\/+$/, '');
  }

  if (url.pathname.endsWith(API_PREFIX)) {
    url.pathname = url.pathname.slice(0, -API_PREFIX.length) || '/';
    return url.toString().replace(/\/+$/, '');
  }

  return normalized;
}

const explicitBackendUrl = toBackendBaseUrl(process.env.BACKEND_URL);
const derivedBackendUrl = toBackendBaseUrl(process.env.NEXT_PUBLIC_API_URL);
const isDevelopment = process.env.NODE_ENV !== 'production';
const backendUrl = explicitBackendUrl ?? (isDevelopment ? 'http://localhost:3001' : derivedBackendUrl);

if (process.env.NODE_ENV === 'production' && !backendUrl) {
  // eslint-disable-next-line no-console
  console.warn(
    '[next.config] BACKEND_URL / NEXT_PUBLIC_API_URL missing. /v1 rewrites disabled; rely on external reverse proxy.',
  );
}

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {},
  allowedDevOrigins: [
    '*.janeway.replit.dev',
    '*.replit.dev',
    '*.repl.co',
    'localhost',
  ],
  async rewrites() {
    if (!backendUrl) return [];

    return [
      {
        source: `${API_PREFIX}/:path*`,
        destination: `${backendUrl}${API_PREFIX}/:path*`,
      },
    ];
  },
};

export default nextConfig;
