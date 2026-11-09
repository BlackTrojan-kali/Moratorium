import {Roles} from '../pages/admin/Roles';
import {Centres} from '../pages/admin/Centres';
import {Help} from '../pages/common/Help';
import {ConnectedDashboard} from '../features/actors/Dashboard';
import {SystemConfiguration,ReferenceData,Templates,WorkflowRules} from '../features/actors/Administration';
import {PaymentPlans,PaymentPlan,NewSchedule,PaymentArchive} from '../features/actors/Payments';
import {Reports,AuditTrail,Correspondence} from '../features/actors/Reports';
import { PaymentSchedulePage, PaymentSchedulePrint } from '../features/payment-schedule/PaymentSchedulePages';
import { useEffect, useState } from 'react';

import {
  Navigate,
  Route,
  Routes,
  matchPath,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { useNewRequestModal } from '../features/deposit/NewRequestModalContext';

import { useAuth } from '../app/AuthContext';
import { getSidebarGroups } from '../config/roles';

import { AppShell } from '../components/layout/AppShell';

import { LoginPage } from '../pages/auth/LoginPage';
import { SignUpPage } from '../pages/auth/SignUpPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { LandingPage } from '../pages/public/LandingPage';
import { ProjectEvolution } from '../pages/common/ProjectEvolution';

import { Profile } from '../pages/common/Profile';
import { Settings } from '../pages/common/Settings';
import { NotificationsPage } from '../pages/common/NotificationsPage';

import { Unauthorized } from '../pages/common/Unauthorized';
import { NotFound } from '../pages/common/NotFound';





import {
  RequestList,
  RequestRecord,
} from '../features/requests/RequestWorkspace';

import { DepositEditor } from '../features/deposit/DepositEditor';

import {
  DepositList,
  DepositDetails,
  DepositReceipt,
  DepositDocuments,
} from '../features/deposit/DepositPages';

import { DecisionHistoryPage } from '../pages/decision/DecisionHistoryPage';
import { DecisionQueuePage } from '../pages/decision/DecisionQueuePage';
import { CpsDepositPage } from '../pages/decision/CpsDepositPage';





// Public account screens (/login, /forgot-password, /reset-password,
// /change-password) render outside the workspace shell and are matched
// individually below so each step of the flow is its own page.

// Preserve the existing request-workspace connections.
const requestWorkspacePaths = [
  'work-queue',
  'assignments',
  'returned',
  'decisions',
  'decision-history',


];

// Connected administration, CPS and reporting pages.
const operationalPaths = [
  'admin/reference-data',
  'admin/templates',
  'payment-plans',
  'reconciliation',
  'overdue',
  'reports/recovery',
  'reports/operations',
  'reports/financial',
  'exports',
];

// Known application addresses distinguish access errors
// from genuinely unknown URLs.
const registeredPaths = [
  '/',
  '/admin/roles',
  '/admin/centres',
  '/admin/users',
  '/requests',
  '/requests/new',
  '/requests/:requestId',
  '/requests/:requestId/edit',
  '/requests/:requestId/receipt',
  '/notifications',
  '/profile',
  '/documents',
  '/deposits',
  '/settings',
  '/admin/settings',
  '/help',
  '/project-evolution',
  '/bilan-evolution',
  '/payments',
  '/payments/:requestId',
  '/payments/:requestId/print',
  '/audit',
  '/admin/workflow',
  '/payment-plans/:requestId',
  '/payment-plans/:requestId/new',
  '/payment-plans/:requestId/archive/:archiveId',
  '/requests/:requestId/correspondence/:kind',
  ...requestWorkspacePaths.map(path => `/${path}`),
  ...operationalPaths.map(path => `/${path}`),
];

const employerOnlyPaths = [
  '/requests/new',
  '/requests/:requestId/edit',
  '/requests/:requestId/receipt',
];

function EmployerNewRequestRoute() {
  const { openNewRequestModal } = useNewRequestModal();
  const navigate = useNavigate();

  useEffect(() => {
    openNewRequestModal();
    navigate('/requests', { replace: true });
  }, [openNewRequestModal, navigate]);

  return <DepositList />;
}

export function AppRoutes() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  const [logoutError, setLogoutError] = useState('');

  if (loading) {
    return (
      <p className="auth-loading" role="status">
        Checking your session…
      </p>
    );
  }

  const pathname =
    location.pathname.replace(/\/+$/, '') || '/';

  if (!user && pathname === '/') {
    return <LandingPage />;
  }

  if (!user && (pathname === '/project-evolution' || pathname === '/bilan-evolution')) {
    return <ProjectEvolution publicMode />;
  }

  // Each public account screen owns one step of the sign-in / recovery flow.
  if (pathname === '/login') {
    return <LoginPage />;
  }

  if (pathname === '/sign-up') {
    return <SignUpPage />;
  }

  if (pathname === '/forgot-password') {
    return <ForgotPasswordPage />;
  }

  if (pathname === '/reset-password') {
    return <ResetPasswordPage />;
  }

  // Password changes live in Settings → Security, so the old standalone
  // address keeps working by forwarding there.
  if (pathname === '/change-password') {
    return <Navigate to="/settings?tab=security" replace />;
  }

  if (!user) {
    // Deep links are preserved so signing in returns to the requested page.
    const requested = `${location.pathname}${location.search}`;

    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(requested)}`}
        replace
      />
    );
  }

  const role = user.role;

  const permittedPaths = getSidebarGroups(role)
    .flatMap(group => group.items)
    .map(item => item.path);

  const knownPage = registeredPaths.some(path =>
    matchPath(
      {
        path,
        end: true,
        caseSensitive: true,
      },
      pathname,
    ),
  );

  const allowed = permittedPaths.some(path =>
    pathname === path ||
    (
      path !== '/' &&
      pathname.startsWith(`${path}/`)
    ),
  );

  const employerOnlyPage = employerOnlyPaths.some(path =>
    matchPath(
      {
        path,
        end: true,
        caseSensitive: true,
      },
      pathname,
    ),
  );

  if (
    knownPage &&
    (
      !allowed ||
      (employerOnlyPage && role !== 'employer')
    )
  ) {
    return <Unauthorized />;
  }

  function signOut() {
    setLogoutError('');

    void logout().catch(caught => {
      setLogoutError(
        caught instanceof Error
          ? caught.message
          : 'Unable to sign out. Please try again.',
      );
    });
  }

  return (
    <>
      {logoutError && (
        <p role="alert">{logoutError}</p>
      )}

      <Routes>
        <Route
          element={
            <AppShell
              user={user}
              onLogout={signOut}
            />
          }
        >
          {/* Dashboard */}
          <Route
            index
            element={<ConnectedDashboard />}
          />

          {/* Bilan d'évolution du projet */}
          <Route
            caseSensitive
            path="project-evolution"
            element={<ProjectEvolution />}
          />
          <Route
            caseSensitive
            path="bilan-evolution"
            element={<ProjectEvolution />}
          />

          {/* User administration lives inside Settings, for administrators. */}
          <Route
            caseSensitive
            path="admin/users"
            element={<Settings initialTab="users" />}
          />

          {/* Requests */}
          <Route
            caseSensitive
            path="requests"
            element={
              role === 'employer'
                ? <DepositList />
                : <RequestList />
            }
          />

          <Route
            caseSensitive
            path="requests/new"
            element={
              role === 'employer'
                ? <EmployerNewRequestRoute />
                : <Unauthorized />
            }
          />

          <Route
            caseSensitive
            path="requests/:requestId"
            element={
              role === 'employer'
                ? <DepositDetails />
                : <RequestRecord />
            }
          />

          <Route
            caseSensitive
            path="requests/:requestId/edit"
            element={
              role === 'employer'
                ? <DepositEditor />
                : <Unauthorized />
            }
          />

          <Route
            caseSensitive
            path="requests/:requestId/receipt"
            element={
              role === 'employer'
                ? <DepositReceipt />
                : <Unauthorized />
            }
          />

          {/* Stage decision workspaces. One queue component serves every stage
              path because the backend already scopes each view to the actor. */}
          <Route caseSensitive path="decisions" element={<DecisionQueuePage view="decisions" />} />
          <Route caseSensitive path="work-queue" element={<DecisionQueuePage view="work-queue" />} />
          <Route caseSensitive path="assignments" element={<DecisionQueuePage view="assignments" />} />
          <Route caseSensitive path="returned" element={<DecisionQueuePage view="returned" />} />
          <Route caseSensitive path="decision-history" element={<DecisionHistoryPage />} />
          <Route caseSensitive path="deposits" element={<CpsDepositPage />} />

          {/* Notifications */}
          <Route
            caseSensitive
            path="notifications"
            element={<NotificationsPage />}
          />

          {/* Profile */}
          <Route
            caseSensitive
            path="profile"
            element={<Profile />}
          />

          {/* Documents */}
          <Route
            caseSensitive
            path="documents"
            element={
              role === 'employer'
                ? <DepositDocuments />
                : <Unauthorized />
            }
          />

          {/* Personal settings */}
          <Route
            caseSensitive
            path="settings"
            element={<Settings />}
          />

          {/* Administrator system settings */}
          <Route
            caseSensitive
            path="admin/settings"
            element={<SystemConfiguration />}
          />

          {/* Help and support */}
          <Route
            caseSensitive
            path="help"
            element={<Help />}
          />

          {/* Employer payment schedule */}
          <Route
            caseSensitive
            path="payments"
            element={
              role === 'employer'
                ? <PaymentSchedulePage />
                : <PaymentPlans />
            }
          />

          <Route
            caseSensitive
            path="payments/:requestId"
            element={
              role === 'employer'
                ? <PaymentSchedulePage />
                : <PaymentPlan />
            }
          />

          <Route
            caseSensitive
            path="payments/:requestId/print"
            element={<PaymentSchedulePrint />}
          />

          <Route
            caseSensitive
            path="admin/roles"
            element={<Roles />}
          />

          {/* Administration, CPS and reports */}
          {operationalPaths.map(path => (
            <Route
              caseSensitive
              key={path}
              path={path}
              element={path==='admin/reference-data'?<ReferenceData/>:path==='admin/templates'?<Templates/>:path==='payment-plans'?(role === 'employer' ? <PaymentSchedulePage /> : <PaymentPlans />):path==='reconciliation'?<PaymentPlans reconciliation/>:path==='overdue'?<PaymentPlans overdue/>:<Reports title={path==='exports'?'Data exports':path==='reports/financial'?'Financial reports':path==='reports/recovery'?'Recovery reports':'Operational reports'}/>} 
            />
          ))}

          <Route path="admin/centres" element={<Centres/>}/>
          <Route path="admin/workflow" element={<WorkflowRules/>}/>
          <Route path="audit" element={<AuditTrail/>}/>
          <Route path="payment-plans/:requestId" element={role === 'employer' ? <PaymentSchedulePage /> : <PaymentPlan />}/>
          <Route path="payment-plans/:requestId/new" element={<NewSchedule/>}/>
          <Route path="payment-plans/:requestId/archive/:archiveId" element={<PaymentArchive/>}/>
          <Route path="requests/:requestId/correspondence/:kind" element={<Correspondence/>}/>
          {/* Unknown addresses */}
          <Route
            path="*"
            element={<NotFound />}
          />
        </Route>
      </Routes>
    </>
  );
}
