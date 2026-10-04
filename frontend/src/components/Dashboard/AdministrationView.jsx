import { useMemo, useState } from 'react';
import { useAdministrationData } from '../../hooks/useAdministrationData';
import { Badge } from '../ui';
import { PageHeader } from '../layout/PageHeader';
import { buildLocations } from './operationsUtils';
import { AdministrationNav } from './AdministrationNav';
import { AdministrationSummary } from './AdministrationSummary';
import { ActivityLog } from './ActivityLog';
import { IntegrationsManagement } from './IntegrationsManagement';
import { OrganizationSettings } from './OrganizationSettings';
import { RolesPermissions } from './RolesPermissions';
import { SecurityOverview } from './SecurityOverview';
import { UnitsManagement } from './UnitsManagement';
import { UsersManagement } from './UsersManagement';

export function AdministrationView({ alerts, baseError, baseLoading, sensors }) {
  const [activeModule, setActiveModule] = useState('Organização');
  const { currentUser, error: authError, loading: authLoading } = useAdministrationData();
  const locations = useMemo(() => buildLocations(sensors, alerts), [alerts, sensors]);

  return (
    <section className="workspace-view workspace-admin-view">
      <PageHeader aside={<Badge tone="muted">Configuração administrativa</Badge>} description="Gerencie a estrutura e o acesso à plataforma Arboris.X." eyebrow="Governança da plataforma" title="Administração" />
      <AdministrationSummary />
      <AdministrationNav activeModule={activeModule} onChange={setActiveModule} />
      {activeModule === 'Organização' && <OrganizationSettings />}
      {activeModule === 'Unidades' && <UnitsManagement error={baseError} loading={baseLoading} locations={locations} />}
      {activeModule === 'Usuários' && <UsersManagement />}
      {activeModule === 'Funções e permissões' && <RolesPermissions />}
      {activeModule === 'Integrações' && <IntegrationsManagement />}
      {activeModule === 'Segurança' && <SecurityOverview currentUser={currentUser} error={authError} loading={authLoading} />}
      {activeModule === 'Registro de atividade' && <ActivityLog />}
    </section>
  );
}
