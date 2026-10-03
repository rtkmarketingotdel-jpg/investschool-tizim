import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Skeleton } from '../ui';
import { OfflineBanner } from './OfflineBanner';

const isTablet = () => window.matchMedia('(min-width: 768px) and (max-width: 1279px)').matches;
const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(isTablet);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onResize = () => setCollapsed(isTablet());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <div className="h-screen bg-bg md:p-4">
    <div className="relative flex h-full overflow-hidden bg-canvas md:rounded-[32px] md:border md:border-border/60 md:shadow-shell">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <Topbar onToggleSidebar={() => (isMobile() ? setMobileOpen((o) => !o) : setCollapsed((c) => !c))} />
        <main className="relative flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
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
