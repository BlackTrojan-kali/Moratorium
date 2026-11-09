import type {
  NavigationGroup,
  NavigationItem,
  UserRole,
} from '../types/domain';

import type { MessageKey } from '../i18n/messages';

export const roleLabels: Record<UserRole, string> = {
  employer: 'Employer representative',
  agent_dt: 'AGENT (DT)',
  ce_cea: 'CE / CEA',
  s_dct: 'S-DCT',
  dt: 'DT — Directeur Technique',
  dg: 'DG — Directeur Général',
  cps: 'CPS',
  administrator: 'System administrator',
};

/** Translated role names, for screens that already use the dictionary. */
export const roleLabelKeys: Record<UserRole, MessageKey> = {
  employer: 'role.employer',
  agent_dt: 'role.agent_dt',
  ce_cea: 'role.ce_cea',
  s_dct: 'role.s_dct',
  dt: 'role.dt',
  dg: 'role.dg',
  cps: 'role.cps',
  administrator: 'role.administrator',
};

/** Sidebar section headings, translated where they are rendered. */
export const groupLabelKeys = {
  MENU: 'nav.group.menu',
  GENERAL: 'nav.group.general',
} as const;

const common: NavigationItem[] = [
  { labelKey: 'nav.dashboard', path: '/', icon: 'layout-dashboard' },
  { labelKey: 'nav.notifications', path: '/notifications', icon: 'bell' },
];

export const navigationByRole: Record<UserRole, NavigationItem[]> = {
  employer: [
    common[0],
    { labelKey: 'nav.myRequests', path: '/requests', icon: 'files' },
    { labelKey: 'nav.newRequest', path: '/requests/new', icon: 'file-plus' },
    { labelKey: 'nav.paymentSchedule', path: '/payments', icon: 'calendar-days' },
    { labelKey: 'nav.paymentPlans', path: '/payment-plans', icon: 'calendar-range' },
    { labelKey: 'nav.documents', path: '/documents', icon: 'folder' },
    common[1],
    { labelKey: 'nav.employerProfile', path: '/profile', icon: 'building-2' },
  ],
  agent_dt: [
    common[0],
    { labelKey: 'nav.paymentPlans', path: '/payment-plans', icon: 'calendar-range' },
    { labelKey: 'nav.workQueue', path: '/work-queue', icon: 'inbox' },
    { labelKey: 'nav.myAssignments', path: '/assignments', icon: 'clipboard-check' },
    { labelKey: 'nav.returnedFiles', path: '/returned', icon: 'undo-2' },
    { labelKey: 'nav.requestSearch', path: '/requests', icon: 'search' },
    common[1],
  ],
  ce_cea: [
    common[0],
    { labelKey: 'nav.paymentPlans', path: '/payment-plans', icon: 'calendar-range' },
    { labelKey: 'nav.requests', path: '/requests', icon: 'files' },
    { labelKey: 'nav.awaitingOpinion', path: '/decisions', icon: 'gavel' },
    { labelKey: 'nav.returnedFiles', path: '/returned', icon: 'undo-2' },
    { labelKey: 'nav.opinionHistory', path: '/decision-history', icon: 'history' },
    common[1],
  ],
  s_dct: [
    common[0],
    { labelKey: 'nav.paymentPlans', path: '/payment-plans', icon: 'calendar-range' },
    { labelKey: 'nav.requests', path: '/requests', icon: 'files' },
    { labelKey: 'nav.awaitingEndorsement', path: '/decisions', icon: 'gavel' },
    { labelKey: 'nav.returnedFiles', path: '/returned', icon: 'undo-2' },
    { labelKey: 'nav.endorsementHistory', path: '/decision-history', icon: 'history' },
    common[1],
  ],
  dt: [
    common[0],
    { labelKey: 'nav.paymentPlans', path: '/payment-plans', icon: 'calendar-range' },
    { labelKey: 'nav.requests', path: '/requests', icon: 'files' },
    { labelKey: 'nav.awaitingValidation', path: '/decisions', icon: 'gavel' },
    { labelKey: 'nav.returnedFiles', path: '/returned', icon: 'undo-2' },
    { labelKey: 'nav.validationHistory', path: '/decision-history', icon: 'history' },
    common[1],
  ],
  dg: [
    common[0],
    { labelKey: 'nav.paymentPlans', path: '/payment-plans', icon: 'calendar-range' },
    { labelKey: 'nav.requests', path: '/requests', icon: 'files' },
    { labelKey: 'nav.finalDecisions', path: '/decisions', icon: 'gavel' },
    { labelKey: 'nav.returnedFiles', path: '/returned', icon: 'undo-2' },
    { labelKey: 'nav.decisionHistory', path: '/decision-history', icon: 'history' },
    common[1],
  ],
  cps: [
    common[0],
    { labelKey: 'nav.depositVerification', path: '/deposits', icon: 'badge-dollar-sign' },
    { labelKey: 'nav.requests', path: '/requests', icon: 'files' },
    { labelKey: 'nav.paymentPlans', path: '/payment-plans', icon: 'calendar-range' },
    { labelKey: 'nav.reconciliation', path: '/reconciliation', icon: 'landmark' },
    { labelKey: 'nav.overdueAccounts', path: '/overdue', icon: 'triangle-alert' },
    { labelKey: 'nav.recoveryReports', path: '/reports/recovery', icon: 'chart-no-axes-combined' },
    common[1],
  ],
  administrator: [
    { labelKey: 'nav.centres', path: '/admin/centres', icon: 'building-2' },
    common[0],
    { labelKey: 'nav.users', path: '/admin/users', icon: 'users' },
    { labelKey: 'nav.rolesAccess', path: '/admin/roles', icon: 'shield-check' },
    { labelKey: 'nav.workflowRules', path: '/admin/workflow', icon: 'workflow' },
    { labelKey: 'nav.referenceData', path: '/admin/reference-data', icon: 'database' },
    { labelKey: 'nav.templates', path: '/admin/templates', icon: 'mail' },
    { labelKey: 'nav.systemSettings', path: '/admin/settings', icon: 'settings' },
  ],
};

export const brand = {
  name: 'MoraPay',
  logoUrl: '/images/logo.jpg',
};

export const rolePhotoByRole: Record<UserRole, string> = {
  employer: '/images/profile-photo-employer.jpg',
  agent_dt: '/images/profile-photo-staff.jpg',
  ce_cea: '/images/profile-photo-staff.jpg',
  s_dct: '/images/profile-photo-staff.jpg',
  dt: '/images/profile-photo-staff.jpg',
  dg: '/images/profile-photo-staff.jpg',
  cps: '/images/profile-photo-cps.jpg',
  administrator: '/images/profile-photo-administrator.jpg',
};

export function getSidebarGroups(role: UserRole): NavigationGroup[] {
  // Profile and settings belong under GENERAL, not MENU.
  const generalPaths = new Set([
    '/profile',
    '/settings',
    '/admin/settings',
    '/project-evolution',
  ]);

  const menuItems = navigationByRole[role].filter(
    (item) => !generalPaths.has(item.path),
  );

    const generalItems: NavigationItem[] = [
    {
      labelKey:
        role === 'employer'
          ? 'nav.employerProfile'
          : 'nav.myProfile',
      path: '/profile',
      icon:
        role === 'employer'
          ? 'building-2'
          : 'user',
    },
    {
      labelKey: 'nav.settings',
      path: '/settings',
      icon: 'settings',
    },
    ...(role === 'administrator'
      ? [
          {
            labelKey: 'nav.systemSettings' as const,
            path: '/admin/settings',
            icon: 'settings',
          },
        ]
      : []),
    {
      labelKey: 'nav.help',
      path: '/help',
      icon: 'circle-help',
    },
    {
      labelKey: 'nav.projectEvolution',
      path: '/project-evolution',
      icon: 'trending-up',
    },
  ];
  return [
    { label: 'MENU', items: menuItems },
    { label: 'GENERAL', items: generalItems },
  ];
}
