'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      router.replace('/dashboard');
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      // Show the real error so auth issues are visible; fall back to generic only
      // when the message is empty or is an internal Tauri serialisation token.
      if (!raw || raw === '[object Object]') {
        setError('Login failed. Check username and password.');
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  };

  const tryDemo = () => {
    setUsername('demo');
    setPassword('demo007');
    setError('');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div
        className="w-full max-w-sm rounded-lg border border-border p-6 shadow-sm"
        style={{ background: 'var(--card)', color: 'var(--card-foreground)' }}
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            ⚡ PokiMate
          </h1>
          <p className="text-sm mt-1 text-muted-foreground">Personal Life OS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Username"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary text-primary-foreground py-2 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center">
          <button
            type="button"
            onClick={tryDemo}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Try Demo
          </button>
        </p>
      </div>
    </main>
  );
}
