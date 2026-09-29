import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleSidebar={() => (isMobile() ? setMobileOpen((o) => !o) : setCollapsed((c) => !c))} />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
