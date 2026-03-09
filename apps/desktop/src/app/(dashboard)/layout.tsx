'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, Topbar, SyncPanel, NotificationDrawer } from '@/components/shell';
import { useAuthStore } from '@/store/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isLoading = useAuthStore((s) => s.isLoading);
  const token = useAuthStore((s) => s.token);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.replace('/login');
    }
  }, [isLoading, token, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          syncOpen={() => setSyncOpen(true)}
          notificationOpen={() => setNotificationOpen(true)}
        />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
      <SyncPanel open={syncOpen} onClose={() => setSyncOpen(false)} />
      <NotificationDrawer open={notificationOpen} onClose={() => setNotificationOpen(false)} />
    </div>
  );
}
