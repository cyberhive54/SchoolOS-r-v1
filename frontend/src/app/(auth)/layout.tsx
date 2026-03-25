/**
 * Auth layout — wraps login and verify-otp pages.
 *
 * Theme is already injected server-side by ServerThemeInjector in the root layout.
 * No additional theme work needed here.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
