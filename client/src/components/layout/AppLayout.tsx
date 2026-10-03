import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Skeleton } from '../ui';
import { OfflineBanner } from './OfflineBanner';

export function AppLayout() {
  return (
    <div className="h-[100dvh] overflow-hidden bg-canvas">
    <div className="relative flex h-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <Topbar />
        <main className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:px-8 md:py-8">
          {/* Suspense lives inside the layout: while a page chunk loads, the sidebar and topbar stay on screen. */}
          <Suspense fallback={<div className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-64" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
    </div>
  );
}
