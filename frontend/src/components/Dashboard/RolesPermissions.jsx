import { Eye, KeyRound, LockKeyhole, Settings2 } from 'lucide-react';
import { Badge, Card, SectionHeader } from '../ui';

const ROLES = ['Diretor', 'Gestor', 'Operador', 'Administrador'];
const AREAS = ['Dashboard', 'Sensores', 'Mapa', 'Alertas', 'Impacto', 'Relatórios', 'Operações', 'Administração'];

export function RolesPermissions() {
  return (
    <section className="workspace-admin-module workspace-reveal" aria-labelledby="roles-title">
      <Card className="workspace-admin-roles-card">
        <SectionHeader eyebrow="Governança" title="Funções e permissões" action={<Badge tone="warning">Estrutura visual</Badge>} />
        <p className="workspace-admin-warning"><LockKeyhole size={15} aria-hidden="true" />Controle de permissões será aplicado quando o RBAC estiver disponível no backend.</p>
        <div className="workspace-admin-role-grid">{ROLES.map((role) => <article key={role}><div><KeyRound size={15} aria-hidden="true" /><strong>{role}</strong></div><Badge tone="muted">Planejada</Badge><small>Função preparada para receber escopos administrativos.</small></article>)}</div>
        <div className="workspace-admin-permissions"><div className="workspace-admin-subheading"><div><p>Matriz conceitual</p><h3>Áreas de acesso</h3></div><span>Sem aplicação no backend</span></div><div className="workspace-admin-permission-grid">{AREAS.map((area) => <div key={area}><strong>{area}</strong><span><Eye size={12} aria-hidden="true" />Visualizar</span><span><Settings2 size={12} aria-hidden="true" />Gerenciar</span><span><LockKeyhole size={12} aria-hidden="true" />Administrar</span></div>)}</div></div>
      </Card>
    </section>
  );
}
