import { Building2 } from 'lucide-react';
import { Card, EmptyState, ErrorState, SectionHeader, Skeleton, StatusBadge } from '../ui';
import { formatLocationTemperature } from './operationsUtils';

function UnitsLoading() {
  return <div className="workspace-admin-table-loading" aria-label="Carregando unidades">{Array.from({ length: 4 }, (_, index) => <div key={index}><Skeleton /><Skeleton /><Skeleton /></div>)}</div>;
}

export function UnitsManagement({ locations, loading, error }) {
  return (
    <section className="workspace-admin-module workspace-reveal" aria-labelledby="units-title">
      <Card className="workspace-admin-table-card">
        <SectionHeader eyebrow="Estrutura operacional" title="Unidades" action={<span className="workspace-admin-module-note">Representação baseada em locais</span>} />
        <p className="workspace-admin-explanation"><Building2 size={15} aria-hidden="true" />A API atual não diferencia unidades administrativas de locais monitorados. Esta tabela reutiliza os locais reais disponíveis na camada de Operações.</p>
        {error ? <ErrorState title="Não foi possível carregar as unidades." message={error} /> : loading ? <UnitsLoading /> : locations.length === 0 ? <EmptyState title="Nenhuma unidade disponível." description="A fonte atual não retornou locais que possam ser apresentados como unidades." /> : <div className="workspace-admin-table-wrap"><table className="workspace-admin-table"><caption className="sr-only">Unidades representadas pelos locais monitorados</caption><thead><tr><th scope="col">Nome</th><th scope="col">Região</th><th scope="col">Status</th><th scope="col">Sensores</th><th scope="col">Temperatura</th><th scope="col">Última atualização</th></tr></thead><tbody>{locations.map((location) => <tr key={location.name}><th scope="row">{location.name}</th><td>{location.region}</td><td><StatusBadge status={location.status} /></td><td>{location.sensors.length}</td><td>{formatLocationTemperature(location.temperature)}</td><td>{location.updatedAt}</td></tr>)}</tbody></table></div>}
      </Card>
    </section>
  );
}
