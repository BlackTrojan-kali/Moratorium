import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Bell, Files, FilePlus, CalendarDays,
  Folder, Building2, Inbox, ClipboardCheck, Undo2,
  Search, Gavel, History, CalendarRange, Landmark,
  TriangleAlert, ChartColumn, Users, ShieldCheck,
  Workflow, Database, Mail, Settings, BadgeDollarSign,
  ScrollText, Download, User, CircleHelp, LogOut,
  ChevronsLeft,
  type LucideIcon,
} from 'lucide-react';

import { brand, getSidebarGroups, groupLabelKeys } from '../../config/roles';
import type { UserRole } from '../../types/domain';
import { useTranslation } from '../../i18n/I18nContext';
import { useNewRequestModal } from '../../features/deposit/NewRequestModalContext';

const icons: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  bell: Bell,
  files: Files,
  'file-plus': FilePlus,
  'calendar-days': CalendarDays,
  folder: Folder,
  'building-2': Building2,
  inbox: Inbox,
  'clipboard-check': ClipboardCheck,
  'undo-2': Undo2,
  search: Search,
  gavel: Gavel,
  history: History,
  'calendar-range': CalendarRange,
  landmark: Landmark,
  'triangle-alert': TriangleAlert,
  'chart-no-axes-combined': ChartColumn,
  'chart-column': ChartColumn,
  users: Users,
  'shield-check': ShieldCheck,
  workflow: Workflow,
  database: Database,
  mail: Mail,
  settings: Settings,
  'badge-dollar-sign': BadgeDollarSign,
  'scroll-text': ScrollText,
  download: Download,
  user: User,
  'circle-help': CircleHelp,
  'trending-up': ChartColumn,
};

interface SidebarProps {
  role: UserRole;
  open: boolean;
  onNavigate: () => void;
  onClose?: () => void;
  onLogout?: () => void;
}

export function Sidebar({
  role,
  open,
  onNavigate,
  onClose,
  onLogout,
}: SidebarProps) {
  const groups = getSidebarGroups(role);
  const allItems = groups.flatMap((group) => group.items);
  const { t } = useTranslation();
  const { openNewRequestModal } = useNewRequestModal();

  return (
    <aside
      id="workspace-navigation"
      className={`workspace-sidebar ${open ? 'is-open' : ''}`}
      aria-label="Workspace navigation"
    >
      <div className="workspace-brand">
        <img src={brand.logoUrl} alt={`${brand.name} logo`} />

        <div>
          <strong>{brand.name}</strong>
        </div>

        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label={t('shell.closeNavigation')}
          title={t('shell.closeNavigation')}
        >
          <ChevronsLeft size={20} aria-hidden="true" />
        </button>
      </div>

      {groups.map((group) => (
        <section
          key={group.label}
          className={`navigation-group ${
            group.label === 'GENERAL' ? 'navigation-general' : ''
          }`}
        >
          <h2>{t(groupLabelKeys[group.label])}</h2>

          <nav aria-label={t(groupLabelKeys[group.label])}>
            {group.items.map((item) => {
              const Icon = icons[item.icon] ?? Files;

              if (role === 'employer' && item.path === '/requests/new') {
                return (
                  <button
                    key={item.path}
                    type="button"
                    className="workspace-link"
                    onClick={() => {
                      onNavigate();
                      openNewRequestModal();
                    }}
                  >
                    <Icon size={19} aria-hidden="true" />
                    <span>{t(item.labelKey)}</span>
                  </button>
                );
              }

              const hasChildLink = allItems.some(
                (other) =>
                  other.path !== item.path &&
                  other.path.startsWith(`${item.path}/`),
              );

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/' || hasChildLink}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `workspace-link ${isActive ? 'is-active' : ''}`
                  }
                >
                  <Icon size={19} aria-hidden="true" />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              );
            })}

            {group.label === 'GENERAL' && (
              <button
                type="button"
                className="workspace-link"
                onClick={onLogout}
                disabled={!onLogout}
                title={!onLogout ? 'Sign in to enable logout' : undefined}
              >
                <LogOut size={19} aria-hidden="true" />
                <span>{t('nav.signOut')}</span>
              </button>
            )}
          </nav>
        </section>
      ))}
    </aside>
  );
}

