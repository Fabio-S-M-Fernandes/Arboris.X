import { useMemo, useState } from 'react';
import { AlertDetailsDrawer } from './AlertDetailsDrawer';
import { PageHeader } from '../layout/PageHeader';
import { AlertFilters } from './AlertFilters';
import { AlertList } from './AlertList';
import { AlertSummary } from './AlertSummary';
import { enrichAlert, getAlertSearchText, getAlertStatus, parseAlertMinutes } from './alertUtils';

const TODAS_AS_REGIOES = 'Todas as regiões';

export function AlertsView({ alerts, sensors, loading, error, onRecognize, onViewSensor, onViewRegion }) {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState(TODAS_AS_REGIOES);
  const [status, setStatus] = useState('Todos');
  const [type, setType] = useState('Todos');
  const [sort, setSort] = useState('recentes');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [recognizingId, setRecognizingId] = useState(null);

  const enrichedAlerts = useMemo(() => alerts.map((alert) => enrichAlert(alert, sensors)), [alerts, sensors]);
  const regions = useMemo(() => [TODAS_AS_REGIOES, ...new Set(enrichedAlerts.map((alert) => alert.regiao || 'Não disponível'))], [enrichedAlerts]);
  const types = useMemo(() => [...new Set(enrichedAlerts.map((alert) => alert.tipo).filter(Boolean))], [enrichedAlerts]);
  const visibleAlerts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    const filtered = enrichedAlerts.filter((alert) => (
      (!query || getAlertSearchText(alert).includes(query))
      && (region === TODAS_AS_REGIOES || (alert.regiao || 'Não disponível') === region)
      && (status === 'Todos' || getAlertStatus(alert) === status)
      && (type === 'Todos' || alert.tipo === type)
    ));

    return [...filtered].sort((first, second) => {
      const difference = parseAlertMinutes(first.horario) - parseAlertMinutes(second.horario);
      return sort === 'antigos' ? -difference : difference;
    });
  }, [enrichedAlerts, region, search, sort, status, type]);

  const clearFilters = () => {
    setSearch('');
    setRegion(TODAS_AS_REGIOES);
    setStatus('Todos');
    setType('Todos');
    setSort('recentes');
  };

  const recognizeAlert = async (alert) => {
    setRecognizingId(alert.id);
    try {
      const updatedAlert = await onRecognize(alert.id);
      setSelectedAlert((current) => current?.id === alert.id ? { ...current, ...updatedAlert, naoLido: false } : current);
    } finally {
      setRecognizingId(null);
    }
  };

  return (
    <section className="workspace-view workspace-alerts-view">
      <PageHeader aside={<strong>{enrichedAlerts.length} {enrichedAlerts.length === 1 ? 'ocorrência' : 'ocorrências'}</strong>} description="Monitore ocorrências ambientais e pontos que exigem atenção." eyebrow="Monitoramento" title="Central de alertas" />
      <AlertSummary alerts={enrichedAlerts} loading={loading} />
      <AlertFilters onClear={clearFilters} region={region} regions={regions} search={search} setRegion={setRegion} setSearch={setSearch} setSort={setSort} setStatus={setStatus} setType={setType} sort={sort} status={status} type={type} types={types} />
      <section className="workspace-panel workspace-alert-list-panel workspace-reveal">
        <div className="workspace-table-heading"><div><p>Ocorrências ambientais</p><h3>{visibleAlerts.length} {visibleAlerts.length === 1 ? 'alerta encontrado' : 'alertas encontrados'}</h3></div><span>Selecione uma ocorrência para consultar o contexto.</span></div>
        <AlertList allCount={enrichedAlerts.length} alerts={visibleAlerts} error={error} loading={loading} onChoose={setSelectedAlert} />
      </section>
      <AlertDetailsDrawer alert={selectedAlert} onClose={() => setSelectedAlert(null)} onRecognize={recognizeAlert} onViewRegion={(selectedRegion) => { setSelectedAlert(null); onViewRegion(selectedRegion); }} onViewSensor={(sensorId) => { setSelectedAlert(null); onViewSensor(sensorId); }} recognizing={recognizingId === selectedAlert?.id} />
    </section>
  );
}

