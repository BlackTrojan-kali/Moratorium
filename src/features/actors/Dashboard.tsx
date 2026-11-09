import { useAuth } from '../../app/AuthContext';
import { AgentDTDashboard } from './AgentDTDashboard';
import { CECEADashboard } from './CECEADashboard';
import { SDCTDashboard } from './SDCTDashboard';
import { DTDashboard } from './DTDashboard';
import { DGDashboard } from './DGDashboard';
import { EmployerDashboard } from '../dashboard/EmployerDashboard';
import { CPSDashboard } from './CPSDashboard';
import { AdminDashboard } from './AdminDashboard';

export function ConnectedDashboard() {
  const { user } = useAuth();

  if (!user) {
    return <p>Loading...</p>;
  }

  // Route to appropriate dashboard based on role
  switch (user.role) {
    case 'employer':
      return <EmployerDashboard />;
    case 'agent_dt':
      return <AgentDTDashboard />;
    case 'ce_cea':
      return <CECEADashboard />;
    case 's_dct':
      return <SDCTDashboard />;
    case 'dt':
      return <DTDashboard />;
    case 'dg':
      return <DGDashboard />;
    case 'cps':
      return <CPSDashboard />;
    case 'administrator':
      return <AdminDashboard />; 
    
    default:
      return <p>Unknown role</p>;
  }
}
