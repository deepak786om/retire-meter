'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>(params.get('mode') === 'signup' ? 'up' : 'in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const supabase = createClient();
    const { error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.push(params.get('next') ?? '/app');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="w-full max-w-[420px] rounded-xl3 bg-surface-1 p-7 shadow-e3">
      <h1 className="text-[21px] font-bold">
        {mode === 'in' ? 'Welcome back' : 'Create your account'}
      </h1>
      <p className="mb-5 mt-1.5 text-[13px] text-ink-variant">
        {mode === 'in' ? 'Pick up where your plan left off.' : 'Your plan carries over — nothing to re-enter.'}
      </p>

      <label className="mb-4 block">
        <span className="mb-1.5 block text-[11px] font-semibold text-ink-variant">Email</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
               autoComplete="email" className="m3-field !pt-3" placeholder="you@example.com" />
      </label>

      <label className="mb-5 block">
        <span className="mb-1.5 block text-[11px] font-semibold text-ink-variant">Password</span>
        <input type="password" required minLength={8} value={password}
               onChange={(e) => setPassword(e.target.value)}
               autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
               className="m3-field !pt-3" placeholder="At least 8 characters" />
      </label>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-danger-container px-4 py-3 text-[12.5px] text-danger-on">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="m3-btn-filled w-full">
        {busy ? 'Working…' : mode === 'in' ? 'Log in' : 'Create account'}
      </button>

      <button type="button" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}
              className="m3-btn-text mt-2 w-full">
        {mode === 'in' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
      </button>

      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-ink-outline">
        Your data stays in the India region. We never sell it and never place an ad.
      </p>
    </form>
  );
}
