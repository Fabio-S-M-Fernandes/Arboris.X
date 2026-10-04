import { Cable, KeyRound, Network, Users } from 'lucide-react';
import { MetricCard } from '../ui';

export function AdministrationSummary() {
  return (
    <section className="workspace-metrics workspace-admin-summary" aria-label="Resumo administrativo">
      <MetricCard icon={Users} title="Usuários" value="—" detail="Disponível quando o serviço administrativo estiver conectado." />
      <MetricCard icon={Network} title="Unidades" value="—" detail="A API atual não diferencia unidades de locais." tone="lime" />
      <MetricCard icon={KeyRound} title="Funções" value="—" detail="Controle de acesso preparado para RBAC." tone="blue" />
      <MetricCard icon={Cable} title="Integrações" value="—" detail="Nenhuma integração administrativa disponível." />
    </section>
  );
}
