import { LoginForm } from '@/components/auth/LoginForm';
import { SchoolThemeInjector } from '@/components/layout/SchoolThemeInjector';

export default function LoginPage() {
  return (
    <>
      <SchoolThemeInjector />
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="w-full max-w-md px-4">
          {/* School logo placeholder — replaced with actual school logo at runtime */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <span className="text-white text-2xl font-bold">S</span>
            </div>
            <h1
              className="text-2xl font-bold"
              style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}
            >
              SchoolOS
            </h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to your school account</p>
          </div>

          <div
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8"
            style={{ borderRadius: 'var(--radius-lg)' }}
          >
            <LoginForm />
          </div>
        </div>
      </div>
    </>
  );
}
