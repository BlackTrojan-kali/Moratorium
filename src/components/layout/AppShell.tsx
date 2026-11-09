import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { useRole } from '../../app/RoleContext';

import { Header } from '../Header';
import { Sidebar } from './Sidebar';
import { NewRequestModalProvider } from '../../features/deposit/NewRequestModalContext';
import type { AuthUser } from '../../types/domain';

import '../../styles/workspace.css';

interface AppShellProps {
  user?: AuthUser | null;
  onLogout?: () => void;
}

export function AppShell({
  user = null,
  onLogout,
}: AppShellProps) {
  const { role: previewRole } = useRole();
  const [navigationOpen, setNavigationOpen] = useState(false);

  const role = user?.role ?? previewRole;

  // Only on mobile does the drawer cover the full screen and need the page
  // behind it locked. On desktop the sidebar and dashboard sit side by side,
  // so both keep their own scrollbars.
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');

    const apply = () => {
      document.body.style.overflow =
        navigationOpen && media.matches ? 'hidden' : '';
    };

    apply();
    media.addEventListener('change', apply);

    return () => {
      document.body.style.overflow = '';
      media.removeEventListener('change', apply);
    };
  }, [navigationOpen]);

  return (
    <NewRequestModalProvider>
      <div
        className={`workspace-shell ${navigationOpen ? 'nav-open' : ''}`}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setNavigationOpen(false);
          }
        }}
      >
        <Sidebar
          role={role}
          open={navigationOpen}
          onNavigate={() => setNavigationOpen(false)}
          onClose={() => setNavigationOpen(false)}
          onLogout={user ? onLogout : undefined}
        />

        <div className="workspace-main">
          <Header
            user={user}
            previewRole={previewRole}
            navigationOpen={navigationOpen}
            onToggleNavigation={() => {
              setNavigationOpen((open) => !open);
            }}
          />

          <main className="content workspace-content">
            <Outlet />
          </main>
        </div>
      </div>
    </NewRequestModalProvider>
  );
}
