'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function Home() {
  const router = useRouter();
  const isLoading = useAuthStore((s) => s.isLoading);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (isLoading) return;
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isLoading, token, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <p className="text-muted-foreground">Loading…</p>
    </main>
  );
}
