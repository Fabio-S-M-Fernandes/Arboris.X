import { ChevronRight, MapPin } from 'lucide-react';
import { EmptyState, ErrorState, Skeleton, StatusBadge } from '../ui';

const numeroLocal = (value, decimals = 0) => Number(value).toLocaleString('pt-BR', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
});

const formatTemperature = (value) => Number.isFinite(Number(value)) ? `${numeroLocal(value, 1)}°C` : 'Não disponível';

function SensorTableLoading() {
  return (
    <tbody aria-label="Carregando sensores">
      {Array.from({ length: 6 }, (_, index) => (
        <tr key={index}>
          {Array.from({ length: 8 }, (__, cellIndex) => <td key={cellIndex}><Skeleton className="workspace-table-skeleton" /></td>)}
        </tr>
      ))}
    </tbody>
  );
}

export function SensorTable({ sensors, loading, error, onChoose }) {
  if (error) return <ErrorState title="Não foi possível carregar os sensores." message={error} />;
  if (!loading && sensors.length === 0) {
    return <EmptyState title="Nenhum sensor encontrado." description="Tente limpar os filtros ou buscar por outro local, região ou código." />;
  }

  return (
    <div className="workspace-sensor-table-wrap">
      <table className="workspace-sensor-table">
        <caption className="sr-only">Sensores ambientais monitorados</caption>
        <thead>
          <tr>
            <th scope="col">Sensor</th>
            <th scope="col">Local</th>
            <th scope="col">Região</th>
            <th scope="col">Temperatura</th>
            <th scope="col">Umidade</th>
            <th scope="col">Status</th>
            <th scope="col">Atualização</th>
            <th scope="col"><span className="sr-only">Ação</span></th>
          </tr>
        </thead>
        {loading ? <SensorTableLoading /> : (
          <tbody>
            {sensors.map((sensor) => {
              const chooseSensor = () => onChoose(sensor);
              return (
                <tr key={sensor.id} tabIndex="0" onClick={chooseSensor} onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    chooseSensor();
                  }
                }}>
                  <th scope="row"><strong>{sensor.id}</strong></th>
                  <td><span className="workspace-table-location"><MapPin size={12} aria-hidden="true" />{sensor.local}</span></td>
                  <td>{sensor.regiao}</td>
                  <td><strong>{formatTemperature(sensor.temperatura)}</strong></td>
                  <td><strong>{sensor.umidade != null ? `${numeroLocal(sensor.umidade)}%` : 'Não disponível'}</strong></td>
                  <td><StatusBadge status={sensor.estado || 'Indisponível'} /></td>
                  <td><time>{sensor.atualizacao || 'Não disponível'}</time></td>
                  <td><button type="button" className="workspace-table-action" onClick={(event) => { event.stopPropagation(); chooseSensor(); }} aria-label={`Abrir detalhes de ${sensor.id}`}><ChevronRight size={16} aria-hidden="true" /></button></td>
                </tr>
              );
            })}
          </tbody>
        )}
      </table>
    </div>
  );
}

