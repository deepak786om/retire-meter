import { Suspense } from 'react';
import { LoginForm } from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-[#F3ECFF] to-surface px-6">
      {/* useSearchParams bails out of static rendering, so the form needs a boundary. */}
      <Suspense fallback={<div className="h-[420px] w-full max-w-[420px] animate-pulse rounded-xl3 bg-surface-1" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
