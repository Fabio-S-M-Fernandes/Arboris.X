import { useState } from 'react';
import { AlertCircle, Clock3, Download, Leaf, Thermometer } from 'lucide-react';
import { convertTemperature, formatTemperature, temperatureSymbol, toCelsius } from '../../lib/temperature';

export function StatusIndicator({ children, tone = 'neutral' }) {
  return <span className={`dashboard-status dashboard-status--${tone}`}><span className="dashboard-status__dot" aria-hidden="true" />{children}</span>;
}

export function EmptyState({ icon: Icon = Leaf, title, children }) {
  return <div className="dashboard-empty"><span className="dashboard-empty__icon"><Icon size={21} strokeWidth={1.65} aria-hidden="true" /></span><div><h3>{title}</h3><p>{children}</p></div></div>;
}

export function PageIntro({ eyebrow, title, description, children }) {
  return <div className="dashboard-page-intro"><div><span className="dashboard-page-intro__eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{children}</div>;
}

export function TemperatureReading({ valueCelsius, measuredAt, unit = 'C', simulated = false }) {
  const date = new Date(measuredAt);
  if (!Number.isFinite(valueCelsius) || Number.isNaN(date.getTime())) {
    return <p className="dashboard-reading-error" role="alert">Não foi possível exibir esta medição.</p>;
  }
  return (
    <div className="dashboard-temperature-reading">
      <Thermometer size={19} aria-hidden="true" />
      <strong>{formatTemperature(valueCelsius, unit)}<span>{temperatureSymbol(unit)}</span></strong>
      <time dateTime={date.toISOString()}>{date.toLocaleString('pt-BR')}</time>
      {simulated && <span className="dashboard-demo-label">MODO DEMONSTRAÇÃO — DADOS SIMULADOS</span>}
    </div>
  );
}

function DemoTrend({ readings, unit }) {
  if (!readings.length) return null;
  const points = readings.map((reading, index) => {
    const x = readings.length === 1 ? 210 : 12 + index * 396 / (readings.length - 1);
    const y = 106 - (reading.valueCelsius - 24) * 10;
    return `${x},${Math.max(8, Math.min(112, y))}`;
  }).join(' ');
  return (
    <div className="dashboard-demo-chart">
      <div><strong>Tendência simulada</strong><span>MODO DEMONSTRAÇÃO — DADOS SIMULADOS</span></div>
      <svg viewBox="0 0 420 120" preserveAspectRatio="none" role="img" aria-label="Sequência visual de temperaturas fictícias para demonstração">
        <path d="M12 106H408" className="dashboard-demo-chart__axis" />
        <polyline points={points} fill="none" className="dashboard-demo-chart__line" />
      </svg>
      <small>Exemplo local reproduzível. Nenhum valor foi medido pelo aparelho. Unidade exibida: {temperatureSymbol(unit)}.</small>
    </div>
  );
}

function TemperaturePanel({ readings = [], dataSource = 'none', unit = 'C', alertCelsius = 32 }) {
  const reading = readings.at(-1);
  const valid = reading && Number.isFinite(reading.valueCelsius) && !Number.isNaN(new Date(reading.measuredAt).getTime());
  const simulated = dataSource === 'demo';
  const aboveLimit = valid && reading.valueCelsius >= alertCelsius;
  return (
    <section className={`dashboard-panel dashboard-temperature${aboveLimit ? ' dashboard-temperature--alert' : ''}`} aria-labelledby="temperature-panel-title">
      <div className="dashboard-panel__heading">
        <div><span className="dashboard-panel__eyebrow">{simulated ? 'EXEMPLO LOCAL' : 'LEITURA DO APARELHO'}</span><h2 id="temperature-panel-title">Temperatura ambiente</h2></div>
        <StatusIndicator tone={aboveLimit ? 'amber' : valid ? 'positive' : 'neutral'}>{simulated ? 'Dados simulados' : valid ? 'Leitura disponível' : 'Sem dados'}</StatusIndicator>
      </div>
      {valid ? (
        <>
          <TemperatureReading valueCelsius={reading.valueCelsius} measuredAt={reading.measuredAt} unit={unit} simulated={simulated} />
          {aboveLimit && <p className="dashboard-temperature-alert" role="status"><AlertCircle size={17} aria-hidden="true" />{simulated ? 'Alerta demonstrativo — temperatura simulada acima do limite.' : 'Temperatura acima do limite configurado. Verifique as condições do ambiente.'}</p>}
          {simulated && <DemoTrend readings={readings} unit={unit} />}
        </>
      ) : (
        <EmptyState icon={Thermometer} title="Nenhuma medição disponível">
          O aparelho mostra a temperatura em sua própria tela. A plataforma ainda não recebe essa leitura.
        </EmptyState>
      )}
      <div className="dashboard-refresh-status">
        <label htmlFor="dashboard-refresh">Atualização das medições reais</label>
        <select id="dashboard-refresh" disabled defaultValue="unavailable">
          <option value="unavailable">Atualização disponível quando houver integração</option>
          <option value="auto">Automático</option>
          <option value="five">A cada 5 minutos</option>
          <option value="paused">Pausado</option>
        </select>
        <span>O relógio da demonstração é separado.</span>
      </div>
    </section>
  );
}

export function OverviewSection(props) {
  return (
    <>
      <PageIntro eyebrow="ARBORIS.X · INTELIGÊNCIA AMBIENTAL" title="Temperatura em foco." description="Um projeto sobre ilhas de calor urbanas e observação ambiental.">
        <StatusIndicator tone={props.dataSource === 'demo' ? 'amber' : 'neutral'}>{props.dataSource === 'demo' ? 'MODO DEMONSTRAÇÃO — DADOS SIMULADOS' : 'Integração em preparação'}</StatusIndicator>
      </PageIntro>
      <section className="dashboard-overview-hero" aria-label="Resumo do projeto">
        <p>PROTÓTIPO ATUAL</p>
        <h2>Observar o ambiente é o primeiro passo.</h2>
        <p className="dashboard-overview-hero__copy">O aparelho mede a temperatura localmente. Esta plataforma prepara a visualização e distingue claramente demonstrações das futuras medições reais.</p>
        <div className="dashboard-overview-hero__meta"><span>FUNEC Riacho</span><span>XIII Mostra de Tecnologia · 2026</span></div>
      </section>
      <TemperaturePanel {...props} />
    </>
  );
}

export function TemperatureSection(props) {
  return <><PageIntro eyebrow="APARELHO" title="Temperatura" description="Acompanhe a leitura quando houver integração. Uma temperatura isolada não comprova uma ilha de calor urbana." /><TemperaturePanel {...props} /></>;
}

function exportRealCsv(readings, unit) {
  const rows = readings.filter((reading) => reading.source === 'real' && Number.isFinite(reading.valueCelsius) && !Number.isNaN(new Date(reading.measuredAt).getTime()));
  if (!rows.length) return;
  const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const lines = [
    ['Data/hora', 'Temperatura', 'Unidade'].map(escape).join(','),
    ...rows.map((reading) => [new Date(reading.measuredAt).toISOString(), convertTemperature(reading.valueCelsius, unit).toFixed(1), temperatureSymbol(unit)].map(escape).join(',')),
  ];
  const blob = new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'arboris-medicoes-reais.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function HistorySection({ readings = [], dataSource = 'none', unit = 'C' }) {
  const realReadings = dataSource === 'real' ? readings
    .filter((reading) => reading.source === 'real' && Number.isFinite(reading.valueCelsius) && !Number.isNaN(new Date(reading.measuredAt).getTime()))
    .sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt)) : [];
  const hasReal = realReadings.length > 0;
  return (
    <>
      <PageIntro eyebrow="REGISTROS" title="Histórico de medições" description="Apenas leituras reais do aparelho aparecerão nesta página.">
        {dataSource === 'demo' && <StatusIndicator tone="amber">MODO DEMONSTRAÇÃO — DADOS SIMULADOS</StatusIndicator>}
      </PageIntro>
      <section className="dashboard-panel dashboard-history" aria-labelledby="history-panel-title">
        {hasReal && <div className="dashboard-print-report">
          <strong>ARBORIS.X · Relatório de medições reais</strong>
          <p>Período consultado: {new Date(realReadings[0].measuredAt).toLocaleString('pt-BR')} a {new Date(realReadings.at(-1).measuredAt).toLocaleString('pt-BR')}</p>
          <p>Gerado em {new Date().toLocaleString('pt-BR')} · Unidade: {temperatureSymbol(unit)}</p>
        </div>}
        <div className="dashboard-panel__heading">
          <div><span className="dashboard-panel__eyebrow">DADOS REAIS</span><h2 id="history-panel-title">Registros do aparelho</h2></div>
          <div className="dashboard-export-actions">
            <button type="button" disabled={!hasReal} onClick={() => exportRealCsv(realReadings, unit)}><Download size={15} /> CSV</button>
            <button type="button" disabled={!hasReal} onClick={() => window.print()}><Download size={15} /> PDF</button>
          </div>
        </div>
        {hasReal ? (
          <div className="dashboard-history-table-wrap"><table className="dashboard-history-table"><caption>Medições reais disponíveis · unidade {temperatureSymbol(unit)}</caption><thead><tr><th>Data e hora</th><th>Temperatura</th></tr></thead><tbody>{realReadings.map((reading) => <tr key={reading.measuredAt}><td>{new Date(reading.measuredAt).toLocaleString('pt-BR')}</td><td>{formatTemperature(reading.valueCelsius, unit)} {temperatureSymbol(unit)}</td></tr>)}</tbody></table></div>
        ) : <EmptyState icon={Clock3} title="Ainda não há medições para exportar.">O histórico começará quando a plataforma receber dados reais do aparelho. Dados simulados não entram aqui.</EmptyState>}
      </section>
    </>
  );
}

function AccountCard({ title, children }) {
  return <section className="dashboard-panel dashboard-account-card"><h2>{title}</h2>{children}</section>;
}

function AccountError({ children, onRetry }) {
  return <div className="dashboard-inline-message dashboard-inline-message--error" role="alert"><AlertCircle size={17} aria-hidden="true" /><span>{children}</span>{onRetry && <button type="button" onClick={onRetry}>Tentar novamente</button>}</div>;
}

function AlertThresholdSetting({ valueCelsius, unit, onSave }) {
  const [draft, setDraft] = useState(String(Math.round(convertTemperature(valueCelsius, unit) * 10) / 10));
  const [error, setError] = useState('');
  const save = (event) => {
    event.preventDefault();
    const value = Number(draft.replace(',', '.'));
    const celsius = toCelsius(value, unit);
    if (!draft.trim() || !Number.isFinite(celsius) || celsius < -50 || celsius > 100) {
      setError(`Informe um valor entre ${formatTemperature(-50, unit)} e ${formatTemperature(100, unit)} ${temperatureSymbol(unit)}.`);
      return;
    }
    onSave(Math.round(celsius * 10) / 10);
    setError('');
  };
  return (
    <form className="dashboard-setting-form" onSubmit={save}>
      <label htmlFor="dashboard-alert-threshold">Limite de alerta ({temperatureSymbol(unit)})</label>
      <div><input id="dashboard-alert-threshold" type="text" inputMode="decimal" value={draft} onChange={(event) => setDraft(event.target.value)} /><button type="submit">Salvar limite</button></div>
      {error && <p role="alert">{error}</p>}
      <small>Valor inicial ajustável. Este limite não é um diagnóstico científico de ilha de calor.</small>
    </form>
  );
}

export function AccountSection({
  sessionUser, deviceState, revokingDevice, trustNotice, onRevokeDevice, onRetryDevices,
  preferences, updatePreference, restoreDefaults, fontSizes, demoActive, onToggleDemo, children,
}) {
  const name = sessionUser?.userMetadata?.full_name || sessionUser?.userMetadata?.name || 'Não informado';
  const email = sessionUser?.email || 'Não informado';
  const fontIndex = fontSizes.indexOf(preferences.fontSize);
  return (
    <>
      <PageIntro eyebrow="ACESSO E PREFERÊNCIAS" title="Configurações" description="Personalize a leitura e gerencie as opções da sua conta." />
      {trustNotice && <p className="dashboard-notice" role="status">{trustNotice}</p>}
      <div className="dashboard-account-grid">
        <AccountCard title="Aparência e acessibilidade">
          <div className="dashboard-setting-row"><label htmlFor="dashboard-theme">Tema</label><select id="dashboard-theme" value={preferences.theme} onChange={(event) => updatePreference('theme', event.target.value)}><option value="dark">Escuro</option><option value="light">Claro</option><option value="auto">Automático (sistema)</option></select></div>
          <label className="dashboard-setting-check"><input type="checkbox" checked={preferences.highContrast} onChange={(event) => updatePreference('highContrast', event.target.checked)} /> Alto contraste para leitura externa</label>
          <div className="dashboard-setting-row"><span>Tamanho do texto</span><div className="dashboard-text-controls" role="group" aria-label="Tamanho do texto"><button type="button" onClick={() => updatePreference('fontSize', fontSizes[Math.max(0, fontIndex - 1)])} disabled={fontIndex === 0} aria-label="Diminuir texto">A−</button><button type="button" onClick={() => updatePreference('fontSize', 100)} aria-label="Tamanho de texto normal">A</button><button type="button" onClick={() => updatePreference('fontSize', fontSizes[Math.min(fontSizes.length - 1, fontIndex + 1)])} disabled={fontIndex === fontSizes.length - 1} aria-label="Aumentar texto">A+</button><output>{preferences.fontSize}%</output></div></div>
          <label className="dashboard-setting-check"><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => updatePreference('reducedMotion', event.target.checked)} /> Reduzir animações</label>
          <button className="dashboard-setting-reset" type="button" onClick={restoreDefaults}>Restaurar preferências padrão</button>
        </AccountCard>
        <AccountCard title="Modo demonstração">
          <p className="dashboard-account-copy">Exibe uma sequência local e fictícia para a Mostra. Nenhum valor vem do aparelho ou é enviado ao banco.</p>
          {demoActive && <p className="dashboard-demo-label">MODO DEMONSTRAÇÃO — DADOS SIMULADOS</p>}
          <button className="dashboard-setting-primary" type="button" onClick={onToggleDemo}>{demoActive ? 'Encerrar demonstração' : 'Iniciar demonstração'}</button>
        </AccountCard>
        <AccountCard title="Alerta de temperatura">
          <p className="dashboard-account-copy">Destaca leituras acima do limite configurado. Uma temperatura isolada não confirma uma ilha de calor urbana.</p>
          <AlertThresholdSetting key={`${preferences.unit}:${preferences.alertCelsius}`} valueCelsius={preferences.alertCelsius} unit={preferences.unit} onSave={(value) => updatePreference('alertCelsius', value)} />
        </AccountCard>
        <AccountCard title="Dados da conta"><dl className="dashboard-account-details"><div><dt>Nome</dt><dd>{name}</dd></div><div><dt>E-mail</dt><dd>{email}</dd></div></dl></AccountCard>
        <AccountCard title="Acesso com Google">
          {sessionUser?.googleLinked ? <p className="dashboard-account-copy" role="status">Sua conta Google está vinculada.</p> : <><p className="dashboard-account-copy">Vincule uma conta Google com o mesmo e-mail para facilitar o próximo acesso.</p>{children}</>}
        </AccountCard>
        {(deviceState.available || deviceState.status === 'error') && <AccountCard title="Navegadores confiáveis">
          <p className="dashboard-account-copy">Gerencie os navegadores que podem dispensar uma nova confirmação de acesso. Esta opção não representa o aparelho de medição.</p>
          {deviceState.status === 'loading' && <p className="dashboard-loading" role="status">Carregando dispositivos…</p>}
          {deviceState.status === 'error' && <AccountError onRetry={onRetryDevices}>{deviceState.error}</AccountError>}
          {deviceState.status === 'ready' && deviceState.devices.length === 0 && <p className="dashboard-account-copy">Nenhum navegador confiável ativo.</p>}
          {deviceState.status === 'ready' && deviceState.devices.map((device) => <div className="dashboard-trusted-device" key={device.id}><span><strong>{device.label || 'Navegador confiável'}</strong><small>Válido até {new Date(device.expiresAt).toLocaleDateString('pt-BR')}</small></span><button type="button" onClick={() => onRevokeDevice(device.id)} disabled={revokingDevice !== null}>{revokingDevice === device.id ? 'Revogando…' : 'Revogar'}</button></div>)}
          {deviceState.error && deviceState.status === 'ready' && <AccountError>{deviceState.error}</AccountError>}
        </AccountCard>}
      </div>
    </>
  );
}
