import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsentStatus, requestPasswordRecovery, updateOptionalCookies } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Activity, AlertCircle, Check, Clock3, Download, Leaf, Link2, LogOut, Palette, Play, RotateCcw, ShieldCheck, Thermometer, UserRound } from 'lucide-react';
import { formatTemperature } from '../../lib/temperature';

const validReading = (reading) => reading && Number.isFinite(reading.valueCelsius)
  && (typeof reading.measuredAt === 'string' && reading.measuredAt.trim() !== ''
    || typeof reading.measuredAt === 'number' && Number.isFinite(reading.measuredAt))
  && Number.isFinite(new Date(reading.measuredAt).getTime());

export function StatusIndicator({ children, tone = 'neutral' }) {
  return <span className={`dashboard-status dashboard-status--${tone}`}><span className="dashboard-status__dot" aria-hidden="true" />{children}</span>;
}

export function EmptyState({ icon: Icon = Leaf, title, children }) {
  return <div className="dashboard-empty"><span className="dashboard-empty__icon"><Icon size={21} strokeWidth={1.65} aria-hidden="true" /></span><div><h3>{title}</h3><p>{children}</p></div></div>;
}

export function PageIntro({ eyebrow, title, description, detail, className = '', children }) {
  return <div className={className ? 'dashboard-page-intro ' + className : 'dashboard-page-intro'}><div><span className="dashboard-page-intro__eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p>{detail && <p className="dashboard-page-intro__detail">{detail}</p>}</div>{children}</div>;
}

export function TemperatureReading({ valueCelsius, measuredAt, simulated = false, showTime = true }) {
  const date = new Date(measuredAt);
  if (!validReading({ valueCelsius, measuredAt })) {
    return <p className="dashboard-reading-error" role="alert">Não foi possível exibir esta medição.</p>;
  }
  return (
    <div className="dashboard-temperature-reading">
      <Thermometer size={19} aria-hidden="true" />
      <strong>{formatTemperature(valueCelsius)}<span>°C</span></strong>
      {showTime && <time dateTime={date.toISOString()}>{date.toLocaleString('pt-BR')}</time>}
      {simulated && <span className="dashboard-demo-label">MODO DEMONSTRAÇÃO — DADOS SIMULADOS</span>}
    </div>
  );
}

export function DemoTrend({ readings }) {
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
      <small>Exemplo local reproduzível. Nenhum valor foi medido pelo aparelho. Unidade exibida: °C.</small>
    </div>
  );
}

function TemperatureInfoCard({ icon: Icon, title, value, detail }) {
  return (
    <article className="dashboard-temperature__info-card">
      <div className="dashboard-temperature__info-heading"><Icon size={17} strokeWidth={1.7} aria-hidden="true" /><span>{title}</span></div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function TemperatureTrend({ reading, previous }) {
  if (!reading || !previous) return null;
  const difference = reading.valueCelsius - previous.valueCelsius;
  const stable = Math.abs(difference) < 0.2;
  const label = stable ? 'Estável' : difference > 0 ? 'Em elevação' : 'Em queda';
  return (
    <div className={'dashboard-temperature__trend' + (stable ? ' dashboard-temperature__trend--stable' : '')} role="status">
      <Activity size={16} aria-hidden="true" />
      <span>Tendência</span>
      <strong>{label}</strong>
      {!stable && <small>{difference > 0 ? '+' : '−'}{formatTemperature(Math.abs(difference))} °C entre as duas últimas leituras</small>}
    </div>
  );
}

function TemperaturePanel({ readings = [], dataSource = 'none', alertCelsius = 32, visualAlerts = true }) {
  const validReadings = readings
    .filter(validReading)
    .sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt));
  const reading = validReadings.at(-1);
  const previousReading = validReadings.at(-2);
  const valid = Boolean(reading);
  const simulated = dataSource === 'demo';
  const aboveLimit = visualAlerts && valid && reading.valueCelsius >= alertCelsius;
  const status = aboveLimit
    ? simulated ? 'Alerta demonstrativo' : 'Alerta térmico'
    : simulated ? 'Simulação ativa' : valid ? 'Leitura disponível' : 'Sem dados';
  const dataMode = simulated ? 'Demonstração local' : valid ? 'Leituras disponíveis' : 'Conteúdo educativo';
  const lastUpdate = valid ? new Date(reading.measuredAt).toLocaleString('pt-BR') : 'Sem leitura registrada';

  return (
    <>
      <section className={'dashboard-panel dashboard-temperature dashboard-temperature--feature' + (!valid ? ' dashboard-temperature--empty' : '') + (aboveLimit ? ' dashboard-temperature--alert' : '')} aria-labelledby="temperature-panel-title">
        <div className="dashboard-panel__heading dashboard-temperature__heading">
          <div className="dashboard-temperature__title">
            <span className="dashboard-temperature__icon"><Thermometer size={21} strokeWidth={1.6} aria-hidden="true" /></span>
            <div><span className="dashboard-panel__eyebrow">{simulated ? 'DADOS SIMULADOS' : valid ? 'LEITURA DO AMBIENTE' : 'EXPLORAÇÃO DA TEMPERATURA'}</span><h2 id="temperature-panel-title">{valid ? 'Leitura térmica' : 'Temperatura e ambiente urbano'}</h2></div>
          </div>
          <StatusIndicator tone={aboveLimit || simulated ? 'amber' : valid ? 'positive' : 'neutral'}>{status}</StatusIndicator>
        </div>
        {valid ? (
          <div className="dashboard-temperature__reading-area">
            <div className="dashboard-temperature__reading">
              <TemperatureReading valueCelsius={reading.valueCelsius} measuredAt={reading.measuredAt} showTime={false} />
              {!simulated && <p className="dashboard-temperature__source">Origem: {reading.origin || 'Não informada'}</p>}
              {simulated && <p className="dashboard-temperature__demo-note"><AlertCircle size={15} aria-hidden="true" />DADOS SIMULADOS · Valores locais de demonstração, sem conexão com o aparelho.</p>}
              {!simulated && <TemperatureTrend reading={reading} previous={previousReading} />}
              {aboveLimit && <p className="dashboard-temperature-alert" role="status"><AlertCircle size={17} aria-hidden="true" />{simulated ? 'Alerta demonstrativo — temperatura simulada acima do limite.' : 'Temperatura acima do limite configurado. Verifique as condições do ambiente.'}</p>}
              {simulated && <DemoTrend readings={validReadings} />}
            </div>
            <div className="dashboard-temperature__reading-art" aria-hidden="true">
              <span className="dashboard-temperature__reading-orbit" />
              <span className="dashboard-temperature__reading-glow" />
              <Thermometer size={68} strokeWidth={1.15} />
              <small>°C</small>
            </div>
          </div>
        ) : (
          <div className="dashboard-temperature__empty">
            <div className="dashboard-temperature__empty-art" aria-hidden="true"><span /><Thermometer size={28} strokeWidth={1.35} /></div>
            <div>
              <span className="dashboard-temperature__waiting">EXPLORAÇÃO EDUCATIVA</span>
              <h3>Explore a temperatura no seu contexto</h3>
              <p>Nesta versão, você pode aprender sobre temperatura e ambiente urbano. O modo demonstração nas Configurações apresenta exemplos claramente identificados como dados simulados.</p>
            </div>
          </div>
        )}
      </section>

      <div className="dashboard-temperature__info-grid" aria-label="Informações da medição">
        <TemperatureInfoCard
          icon={Activity}
          title="Modo de visualização"
          value={dataMode}
          detail={simulated ? 'Sequência fictícia gerada neste navegador.' : valid ? 'Dados disponíveis na plataforma.' : 'Conteúdos ambientais disponíveis nesta versão.'}
        />
        <TemperatureInfoCard
          icon={Clock3}
          title="Última leitura"
          value={lastUpdate}
          detail={valid ? simulated ? 'Horário da sequência demonstrativa.' : 'Horário informado na medição.' : 'Nenhum horário informado.'}
        />
        <TemperatureInfoCard
          icon={Thermometer}
          title="Limite configurado"
          value={'A partir de ' + formatTemperature(alertCelsius) + ' °C'}
          detail="Preferência visual do usuário; não representa um diagnóstico ambiental."
        />
      </div>

      <aside className="dashboard-temperature__observation" aria-labelledby="temperature-observation-title">
        <span className="dashboard-temperature__observation-icon"><Leaf size={19} strokeWidth={1.6} aria-hidden="true" /></span>
        <div><span>OBSERVAÇÃO AMBIENTAL</span><h3 id="temperature-observation-title">Temperatura precisa de contexto.</h3><p>Uma leitura descreve um local e momento. Compare horários e lugares e observe sombra, vegetação, vento e superfícies; uma medição isolada não confirma uma ilha de calor.</p></div>
      </aside>
    </>
  );
}

export function TemperatureSection({ readings = [], dataSource = 'none', alertCelsius = 32, visualAlerts = true }) {
  const simulated = dataSource === 'demo';
  const hasReading = readings.some(validReading);
  const status = simulated ? 'MODO DEMONSTRAÇÃO' : hasReading ? 'LEITURA DISPONÍVEL' : 'EXPLORAÇÃO EDUCATIVA';
  return (
    <div className="dashboard-temperature-page">
      <PageIntro
        className="dashboard-temperature-hero"
        eyebrow="MONITORAMENTO AMBIENTAL"
        title="Temperatura"
        description="Uma leitura do ambiente. Uma nova perspectiva sobre o calor urbano."
        detail="O projeto estuda a temperatura ambiente e sua relação com as ilhas de calor urbanas."
      >
        <div className="dashboard-temperature-hero__side">
          <StatusIndicator tone={simulated ? 'amber' : hasReading ? 'positive' : 'neutral'}>{status}</StatusIndicator>
          <div className="dashboard-temperature-hero__visual" aria-hidden="true">
            <span className="dashboard-temperature-hero__orbit" />
            <span className="dashboard-temperature-hero__glow" />
            <Thermometer size={37} strokeWidth={1.35} />
          </div>
        </div>
      </PageIntro>
      <TemperaturePanel readings={readings} dataSource={dataSource} alertCelsius={alertCelsius} visualAlerts={visualAlerts} />
    </div>
  );
}
function exportRealCsv(readings) {
  const rows = readings.filter((reading) => reading.source === 'real' && validReading(reading));
  if (!rows.length) return;
  const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const hasOrigin = rows.some((reading) => readingOrigin(reading) !== 'Não informada');
  const safeOrigin = (origin) => /^[=+@\-\t\r]/.test(origin) ? `'${origin}` : origin;
  const lines = [
    ['Data/hora', 'Temperatura', 'Unidade', ...(hasOrigin ? ['Origem'] : [])].map(escape).join(','),
    ...rows.map((reading) => [
      new Date(reading.measuredAt).toISOString(), reading.valueCelsius.toFixed(1), '°C',
      ...(hasOrigin ? [safeOrigin(readingOrigin(reading))] : []),
    ].map(escape).join(',')),
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

function readingOrigin(reading) {
  return typeof reading.origin === 'string' && reading.origin.trim() ? reading.origin.trim() : 'Não informada';
}

function HistoryChart({ readings }) {
  const firstTime = new Date(readings[0].measuredAt).getTime();
  const lastTime = new Date(readings.at(-1).measuredAt).getTime();
  const values = readings.map((reading) => reading.valueCelsius);
  const minimum = values.reduce((lowest, value) => Math.min(lowest, value), Infinity);
  const maximum = values.reduce((highest, value) => Math.max(highest, value), -Infinity);
  const points = readings.map((reading, index) => {
    const time = new Date(reading.measuredAt).getTime();
    const x = firstTime === lastTime ? 340 : 24 + (time - firstTime) / (lastTime - firstTime) * 632;
    const y = minimum === maximum ? 95 : 166 - (reading.valueCelsius - minimum) / (maximum - minimum) * 142;
    return { x, y, key: `${reading.measuredAt}-${index}` };
  });
  return (
    <figure className="dashboard-history-chart">
      <figcaption><strong>Evolução das leituras</strong><span>Registros reais · temperatura em °C</span></figcaption>
      <svg viewBox="0 0 680 190" preserveAspectRatio="none" role="img" aria-label={`Temperatura entre ${formatTemperature(minimum)} e ${formatTemperature(maximum)} graus Celsius em ${readings.length} ${readings.length === 1 ? 'medição real' : 'medições reais'}`}>
        {points.length > 1 && <polyline points={points.map(({ x, y }) => `${x},${y}`).join(' ')} fill="none" className="dashboard-history-chart__line" />}
        {points.map(({ x, y, key }) => <circle key={key} cx={x} cy={y} r="4" className="dashboard-history-chart__point" />)}
      </svg>
      <div className="dashboard-history-chart__axis"><time dateTime={readings[0].measuredAt}>{new Date(readings[0].measuredAt).toLocaleString('pt-BR')}</time><time dateTime={readings.at(-1).measuredAt}>{new Date(readings.at(-1).measuredAt).toLocaleString('pt-BR')}</time></div>
    </figure>
  );
}

export function HistorySection({ readings = [], dataSource = 'none', status = 'ready' }) {
  const realReadings = dataSource === 'real' ? readings
    .filter((reading) => reading.source === 'real' && validReading(reading))
    .sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt)) : [];
  const hasReal = status === 'ready' && realReadings.length > 0;
  const exportNote = status === 'loading'
    ? 'Aguarde a consulta terminar para exportar medições reais.'
    : status === 'error'
      ? 'A exportação fica indisponível enquanto não for possível consultar os registros.'
      : 'CSV e PDF ficam disponíveis quando há medições reais registradas.';
  return (
    <div className="dashboard-history-page">
      <div className="dashboard-history-hero">
        <PageIntro eyebrow="MONITORAMENTO AMBIENTAL" title="Histórico de medições" description="Consulte as leituras reais que tenham sido recebidas e registradas pela plataforma." detail="Para investigar variações térmicas, compare locais e horários e considere sombra, vegetação, vento e superfícies. Os dados simulados da demonstração não são incluídos neste histórico." />
        <div className="dashboard-history-hero__art" aria-hidden="true"><span className="dashboard-history-hero__orbit" /><Clock3 size={58} strokeWidth={1.1} /></div>
      </div>
      <section className="dashboard-panel dashboard-history" aria-labelledby="history-panel-title">
        {hasReal && <div className="dashboard-print-report">
          <strong>ARBORIS.X · Relatório de medições reais</strong>
          <p>Período consultado: {new Date(realReadings[0].measuredAt).toLocaleString('pt-BR')} a {new Date(realReadings.at(-1).measuredAt).toLocaleString('pt-BR')}</p>
          <p>Gerado em {new Date().toLocaleString('pt-BR')} · Unidade: °C · Fonte: registros reais do aparelho</p>
        </div>}
        <div className="dashboard-panel__heading dashboard-history__heading">
          <div><span className="dashboard-panel__eyebrow">REGISTROS DO APARELHO</span><h2 id="history-panel-title">Medições registradas</h2></div>
          <div className="dashboard-export-actions">
            <button type="button" disabled={!hasReal} aria-describedby={!hasReal ? 'history-export-note' : undefined} onClick={() => exportRealCsv(realReadings)}><Download size={15} aria-hidden="true" /> CSV</button>
            <button type="button" disabled={!hasReal} aria-describedby={!hasReal ? 'history-export-note' : undefined} onClick={() => window.print()}><Download size={15} aria-hidden="true" /> PDF</button>
          </div>
        </div>
        {!hasReal && <p className="dashboard-history__export-note" id="history-export-note">{exportNote}</p>}
        {status === 'loading' ? <div className="dashboard-history__state" role="status"><Clock3 size={22} aria-hidden="true" /><p>Consultando medições reais...</p></div> : status === 'error' ? <div className="dashboard-history__state" role="alert"><AlertCircle size={22} aria-hidden="true" /><p>Não foi possível consultar as medições agora.</p></div> : hasReal ? (
          <div className="dashboard-history__records">
            <HistoryChart readings={realReadings} />
            <div className="dashboard-history-table-wrap"><table className="dashboard-history-table"><caption>Medições reais disponíveis · unidade °C · origem indicada quando informada</caption><thead><tr><th>Data e hora</th><th>Temperatura</th><th>Origem</th></tr></thead><tbody>{realReadings.map((reading, index) => <tr key={`${reading.measuredAt}-${index}`}><td><time dateTime={reading.measuredAt}>{new Date(reading.measuredAt).toLocaleString('pt-BR')}</time></td><td>{formatTemperature(reading.valueCelsius)} °C</td><td>{readingOrigin(reading)}</td></tr>)}</tbody></table></div>
          </div>
        ) : <div className="dashboard-history__empty"><span className="dashboard-history__empty-icon" aria-hidden="true"><Clock3 size={30} strokeWidth={1.25} /></span><h3>Nenhum registro de medição para consultar</h3><p>Esta área exibe apenas medições reais quando existem registros disponíveis. Explore o conteúdo ambiental e o modo demonstração, que usa dados simulados sem criar registros neste histórico.</p>{dataSource === 'demo' && <small>Os dados simulados da demonstração não são medições reais.</small>}</div>}
      </section>
      <aside className="dashboard-history__context" aria-labelledby="history-context-title">
        <div><span className="dashboard-panel__eyebrow">POR QUE REGISTRAR MEDIÇÕES?</span><h2 id="history-context-title">Mais do que uma leitura isolada.</h2><p>Observar a temperatura em diferentes momentos ajuda a identificar variações e relacioná-las às condições do ambiente.</p></div>
        <ul>
          <li><Clock3 size={18} aria-hidden="true" /><span><strong>Tempo</strong>Comparar observações feitas em momentos diferentes.</span></li>
          <li><Leaf size={18} aria-hidden="true" /><span><strong>Ambiente</strong>Considerar sombra, vegetação e superfícies urbanas.</span></li>
          <li><Activity size={18} aria-hidden="true" /><span><strong>Análise</strong>Interpretar variações a partir de dados registrados.</span></li>
        </ul>
      </aside>
    </div>
  );
}

function AccountCard({ title, label, icon: Icon, children }) {
  return <section className="dashboard-panel dashboard-account-card">
    <header className="dashboard-account-card__heading">
      <span className="dashboard-account-card__icon"><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span>
      <div><span className="dashboard-account-card__label">{label}</span><h2>{title}</h2></div>
    </header>
    <div className="dashboard-account-card__body">{children}</div>
  </section>;
}

function AccountError({ children, onRetry }) {
  return <div className="dashboard-inline-message dashboard-inline-message--error" role="alert"><AlertCircle size={17} aria-hidden="true" /><span>{children}</span>{onRetry && <button type="button" onClick={onRetry}>Tentar novamente</button>}</div>;
}

function AlertThresholdSetting({ valueCelsius, onSave }) {
  const [draft, setDraft] = useState(String(Math.round(valueCelsius * 10) / 10));
  const [error, setError] = useState('');
  const save = (event) => {
    event.preventDefault();
    const value = Number(draft.replace(',', '.'));
    if (!draft.trim() || !Number.isFinite(value) || value < -50 || value > 100) {
      setError('Informe um valor entre -50 e 100 °C.');
      return;
    }
    onSave(Math.round(value * 10) / 10);
    setError('');
  };
  return (
    <form className="dashboard-setting-form" onSubmit={save}>
      <label htmlFor="dashboard-alert-threshold">Limite de alerta (°C)</label>
      <div><input id="dashboard-alert-threshold" type="text" inputMode="decimal" value={draft} onChange={(event) => setDraft(event.target.value)} /><button type="submit">Salvar limite</button></div>
      {error && <p role="alert">{error}</p>}
      <small>Valor inicial ajustável. Este limite não é um diagnóstico científico de ilha de calor.</small>
    </form>
  );
}

function ProfileNameSetting({ sessionUser, onNameSaved }) {
  const currentName = sessionUser?.userMetadata?.full_name || sessionUser?.userMetadata?.name || '';
  const [draft, setDraft] = useState(currentName);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const save = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    const name = draft.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 80 || /\p{Cc}/u.test(name)) {
      setStatus('Informe um nome de 2 a 80 caracteres, sem caracteres de controle.');
      return;
    }
    if (name === currentName) { setStatus('O nome já está atualizado.'); return; }
    pending.current = true;
    setSaving(true);
    setStatus('');
    try {
      const { data, error } = await supabase.from('profiles').update({ full_name: name })
        .eq('id', sessionUser.id).select('full_name').single();
      if (error || data?.full_name !== name) throw error || new Error('Perfil indisponível.');
      onNameSaved(name);
      setStatus('Nome atualizado na conta.');
    } catch {
      setStatus('Não foi possível concluir a alteração. Tente novamente.');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  return <form className="dashboard-setting-form dashboard-profile-form" onSubmit={save}>
    <label htmlFor="dashboard-display-name">Nome de exibição</label>
    <div><input id="dashboard-display-name" autoComplete="name" maxLength={80} value={draft} onChange={(event) => { setDraft(event.target.value); setStatus(''); }} disabled={saving} /><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar nome'}</button></div>
    {status && <p role="status">{status}</p>}
  </form>;
}

function PasswordRecoverySetting({ email, available }) {
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [retryUntil, setRetryUntil] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const busy = useRef(false);
  useEffect(() => {
    if (retryUntil <= Date.now()) return undefined;
    const timer = window.setInterval(() => {
      setClock(Date.now());
      if (Date.now() >= retryUntil) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);
  const retrySeconds = Math.max(0, Math.ceil((retryUntil - clock) / 1000));
  if (!available) return <p className="dashboard-account-copy">Esta conta não possui login por senha. Use o provedor vinculado para entrar.</p>;
  const request = async () => {
    if (busy.current || !email || sent || retryUntil > Date.now()) return;
    busy.current = true;
    setPending(true);
    setStatus('');
    try {
      await requestPasswordRecovery(email);
      setSent(true);
      setStatus('Enviamos as instruções para o e-mail da conta. Confira também a pasta de spam.');
    } catch (error) {
      if (error?.status === 429) {
        setRetryUntil(Date.now() + (error.retryAfterSeconds || 60) * 1000);
        setClock(Date.now());
        setStatus('O serviço limitou novas solicitações. Aguarde o tempo indicado.');
      } else setStatus('Não foi possível solicitar a redefinição agora. Tente novamente mais tarde.');
    } finally { busy.current = false; setPending(false); }
  };
  return <div className="dashboard-account-action"><button className="dashboard-setting-reset" type="button" disabled={pending || sent || retrySeconds > 0} onClick={request}>{pending ? 'Solicitando…' : retrySeconds > 0 ? `Aguarde ${retrySeconds}s` : 'Enviar link para redefinir senha'}</button>{status && <p role="status">{status}</p>}</div>;
}

function ConsentSetting() {
  const [state, setState] = useState({ status: 'loading', accepted: false, manageable: false, saved: '' });
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    getConsentStatus(controller.signal).then((result) => {
      if (active) setState({ status: 'ready', accepted: result.optionalCookiesAccepted === true, manageable: result.canManageOptionalCookies === true, saved: '' });
    }).catch(() => { if (active) setState((current) => ({ ...current, status: 'error' })); });
    return () => { active = false; controller.abort(); };
  }, []);
  const save = async () => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    try {
      const result = await updateOptionalCookies(state.accepted);
      setState((current) => ({ ...current, accepted: result.optionalCookiesAccepted === true, saved: 'Preferência de cookies salva.' }));
    } catch {
      setState((current) => ({ ...current, saved: 'Não foi possível salvar. Tente novamente.' }));
    } finally { pending.current = false; setSaving(false); }
  };
  return <div className="dashboard-consent-settings">
    <p className="dashboard-account-copy">Seu acesso continua protegido por Supabase, consentimento obrigatório e código OTP.</p>
    <div className="dashboard-settings-links"><Link to="/privacidade">Política de Privacidade</Link><Link to="/termos">Termos de Uso</Link></div>
    {state.status === 'loading' && <p role="status">Carregando preferência de cookies…</p>}
    {state.status === 'error' && <p role="alert">Não foi possível consultar o consentimento. Recarregue a página para tentar novamente.</p>}
    {state.status === 'ready' && (state.manageable ? <><label className="dashboard-setting-check"><input type="checkbox" checked={state.accepted} onChange={(event) => setState((current) => ({ ...current, accepted: event.target.checked, saved: '' }))} /> Aceitar cookies opcionais para navegadores confiáveis</label><button className="dashboard-setting-reset" type="button" disabled={saving} onClick={save}>{saving ? 'Salvando…' : 'Salvar preferência'}</button></> : <p className="dashboard-account-copy">Esta conta antiga não possui um registro de consentimento editável.</p>)}
    {state.saved && <p role="status">{state.saved}</p>}
  </div>;
}

export function AccountSection({
  sessionUser, deviceState, revokingDevice, trustNotice, onRevokeDevice, onRetryDevices,
  preferences, updatePreference, restoreDefaults, fontSizes, demoActive, onToggleDemo, onLogout, onNameSaved, children,
}) {
  const name = sessionUser?.userMetadata?.full_name || sessionUser?.userMetadata?.name || 'Não informado';
  const email = sessionUser?.email || 'Não informado';
  const providers = sessionUser?.authProviders || [];
  const providerText = providers.length ? providers.map((provider) => provider === 'google' ? 'Google' : 'E-mail e senha').join(' e ') : 'Não informado';
  const fontIndex = fontSizes.indexOf(preferences.fontSize);
  const [alertNotice, setAlertNotice] = useState('');
  return (
    <>
      <PageIntro eyebrow="ACESSO E PREFERÊNCIAS" title="Configurações" description="Ajuste a experiência do Dashboard e gerencie os recursos da sua conta." detail="As preferências de aparência e leitura ficam salvas neste navegador." />
      {trustNotice && <p className="dashboard-notice" role="status">{trustNotice}</p>}
      <div className="dashboard-account-grid">
        <AccountCard title="Aparência e acessibilidade" label="INTERFACE" icon={Palette}>
          <div className="dashboard-setting-row"><label htmlFor="dashboard-theme">Tema</label><select id="dashboard-theme" value={preferences.theme} onChange={(event) => updatePreference('theme', event.target.value)}><option value="dark">Escuro</option><option value="light">Claro</option><option value="auto">Automático (sistema)</option></select></div>
          <label className="dashboard-setting-check"><input type="checkbox" checked={preferences.highContrast} onChange={(event) => updatePreference('highContrast', event.target.checked)} /> Alto contraste para leitura externa</label>
          <div className="dashboard-setting-row"><span>Tamanho do texto</span><div className="dashboard-text-controls" role="group" aria-label="Tamanho do texto"><button type="button" onClick={() => updatePreference('fontSize', fontSizes[Math.max(0, fontIndex - 1)])} disabled={fontIndex === 0} aria-label="Diminuir texto">A−</button><button type="button" onClick={() => updatePreference('fontSize', 100)} aria-label="Tamanho de texto normal">A</button><button type="button" onClick={() => updatePreference('fontSize', fontSizes[Math.min(fontSizes.length - 1, fontIndex + 1)])} disabled={fontIndex === fontSizes.length - 1} aria-label="Aumentar texto">A+</button><output>{preferences.fontSize}%</output></div></div>
          <label className="dashboard-setting-check"><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => updatePreference('reducedMotion', event.target.checked)} /> Reduzir animações</label>
          <button className="dashboard-setting-reset" type="button" onClick={restoreDefaults}><RotateCcw size={15} aria-hidden="true" />Restaurar preferências padrão</button>
        </AccountCard>
        <AccountCard title="Desempenho e animações" label="FLUIDEZ" icon={Activity}>
          <p className="dashboard-account-copy">Escolha a intensidade dos efeitos visuais. O modo Automático considera os recursos do dispositivo e suas preferências.</p>
          <fieldset className="dashboard-performance-options"><legend>Modo de desempenho</legend>
            {[['auto', 'Automático', 'Adapta os efeitos ao dispositivo.'], ['balanced', 'Equilibrado', 'Mantém movimento leve com menos camadas.'], ['efficient', 'Econômico', 'Reduz efeitos para priorizar fluidez.']].map(([value, title, detail]) => <label key={value} className="dashboard-performance-option"><input type="radio" name="performance-mode" value={value} checked={preferences.performanceMode === value} onChange={() => updatePreference('performanceMode', value)} /><span><strong>{title}</strong><small>{detail}</small></span></label>)}
          </fieldset>
          <p className="dashboard-setting-hint">Movimento reduzido do sistema e a opção acima de acessibilidade continuam respeitados.</p>
        </AccountCard>
        <AccountCard title="Modo demonstração" label="DADOS SIMULADOS" icon={Play}>
          <p className="dashboard-account-copy">Exibe uma sequência local e fictícia para a Mostra. Nenhum valor vem do aparelho ou é enviado ao banco.</p>
          <div className="dashboard-demo-state"><StatusIndicator tone={demoActive ? 'positive' : 'neutral'}>{demoActive ? 'Demonstração ativa' : 'Demonstração desligada'}</StatusIndicator></div>
          <button className="dashboard-setting-primary" type="button" onClick={onToggleDemo}>{demoActive ? <><Check size={16} aria-hidden="true" />Encerrar demonstração</> : <><Play size={16} aria-hidden="true" />Iniciar demonstração</>}</button>
        </AccountCard>
        <AccountCard title="Alerta de temperatura" label="MONITORAMENTO" icon={Thermometer}>
          <p className="dashboard-account-copy">Destaca leituras acima do limite configurado. Uma temperatura isolada não confirma uma ilha de calor urbana.</p>
          <AlertThresholdSetting key={preferences.alertCelsius} valueCelsius={preferences.alertCelsius} onSave={(value) => { updatePreference('alertCelsius', value); setAlertNotice('Limite salvo neste navegador.'); }} />
          {alertNotice && <p className="dashboard-setting-success" role="status">{alertNotice}</p>}
          <div className="dashboard-setting-divider" />
          <label className="dashboard-setting-check"><input type="checkbox" checked={preferences.visualAlerts} onChange={(event) => updatePreference('visualAlerts', event.target.checked)} /> Exibir alertas visuais de temperatura</label>
          <button className="dashboard-setting-reset" type="button" onClick={() => { updatePreference('alertCelsius', 32); setAlertNotice('Limite padrão restaurado.'); }}>Restaurar limite de 32 °C</button>
        </AccountCard>
        <AccountCard title="Conta e sessão" label="SESSÃO ATUAL" icon={UserRound}>
          <dl className="dashboard-account-details"><div><dt>Nome</dt><dd>{name}</dd></div><div><dt>E-mail</dt><dd>{email}</dd></div><div><dt>Provedor</dt><dd>{providerText}</dd></div><div><dt>E-mail verificado</dt><dd>{sessionUser?.emailConfirmed === true ? 'Sim' : sessionUser?.emailConfirmed === false ? 'Não' : 'Não informado'}</dd></div></dl>
          <div className="dashboard-setting-divider" />
          <ProfileNameSetting sessionUser={sessionUser} onNameSaved={onNameSaved} />
          <div className="dashboard-setting-divider" />
          <h3 className="dashboard-setting-subtitle">Redefinir senha</h3>
          <PasswordRecoverySetting email={sessionUser?.email} available={providers.includes('email')} />
          <button className="dashboard-account-logout" type="button" onClick={onLogout}><LogOut size={17} aria-hidden="true" />Sair da conta</button>
        </AccountCard>
        <AccountCard title="Segurança e privacidade" label="CONTROLE DA CONTA" icon={ShieldCheck}>
          <p className="dashboard-account-copy">Provedor: {providerText}. E-mail {sessionUser?.emailConfirmed === true ? 'verificado' : 'com estado de verificação indisponível'}.</p>
          <ConsentSetting />
        </AccountCard>
        <AccountCard title="Preferências de navegação" label="PAINEL" icon={Link2}>
          <p className="dashboard-account-copy">A seção atual já é preservada no endereço da página ao atualizar.</p>
          <label className="dashboard-setting-check"><input type="checkbox" checked={!preferences.sidebarCollapsed} onChange={(event) => updatePreference('sidebarCollapsed', !event.target.checked)} /> Manter barra lateral aberta no computador</label>
          <button className="dashboard-setting-reset" type="button" onClick={() => { updatePreference('sidebarCollapsed', true); updatePreference('sidebarWidth', 252); }}>Restaurar navegação padrão</button>
        </AccountCard>
        <AccountCard title="Acesso com Google" label="PROVEDOR DE ACESSO" icon={Link2}>
          {sessionUser?.googleLinked ? <p className="dashboard-account-copy" role="status">Sua conta Google está vinculada.</p> : <><p className="dashboard-account-copy">Vincule uma conta Google com o mesmo e-mail para facilitar o próximo acesso.</p>{children}</>}
        </AccountCard>
        {(deviceState.available || deviceState.status === 'error') && <AccountCard title="Navegadores confiáveis" label="SEGURANÇA DA CONTA" icon={ShieldCheck}>
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
