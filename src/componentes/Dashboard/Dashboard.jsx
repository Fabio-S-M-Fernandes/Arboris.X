import { useState } from 'react';
import {
  Activity,
  Bell,
  CheckCircle2,
  ChevronRight,
  CloudRain,
  Cpu,
  Droplets,
  Gauge,
  LayoutDashboard,
  Leaf,
  LogOut,
  Map,
  Menu,
  ThermometerSun,
  Wifi,
  X,
} from 'lucide-react';
import './Dashboard.css';

const navigation = [
  { label: 'Visão Geral', icon: LayoutDashboard },
  { label: 'Sensores', icon: Gauge },
  { label: 'Mapa de Calor', icon: Map },
];

const sensorReadings = [
  { name: 'Sensor ARB-042', location: 'Praça das Palmeiras', value: '24.8°C', status: 'Estável', level: 78 },
  { name: 'Sensor ARB-017', location: 'Av. Central — Setor Norte', value: '26.1°C', status: 'Estável', level: 64 },
  { name: 'Sensor ARB-031', location: 'Jardim Comunitário', value: '23.4°C', status: 'Excelente', level: 91 },
];

function MetricCard({ icon: Icon, label, value, detail, accent = 'green', children }) {
  const accents = {
    green: 'border-emerald-400/20 from-emerald-400/10 text-emerald-300 shadow-[0_0_32px_rgba(16,185,129,0.08)]',
    cyan: 'border-cyan-400/20 from-cyan-400/10 text-cyan-300 shadow-[0_0_32px_rgba(34,211,238,0.08)]',
    lime: 'border-lime-300/20 from-lime-300/10 text-lime-200 shadow-[0_0_32px_rgba(163,230,53,0.08)]',
  };

  return (
    <article className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 ${accents[accent]}`}>
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-current opacity-[0.06] blur-2xl" />
      <div className="mb-7 flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border-white/10 bg-black/20 text-current">
          <Icon size={21} strokeWidth={1.6} />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">ao vivo</span>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <strong className="font-sans text-3xl font-light tracking-tight text-white">{value}</strong>
        {children}
      </div>
      <p className="mt-2 text-xs text-slate-400">{detail}</p>
    </article>
  );
}

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('Visão Geral');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const selectSection = (label) => {
    setActiveSection(label);
    setMobileMenuOpen(false);
  };

  return (
    <main className="dashboard-shell min-h-screen overflow-hidden bg-[#050f14] text-slate-100">
      <div className="dashboard-grid pointer-events-none fixed inset-0 opacity-30" aria-hidden="true" />
      <div className="dashboard-orb dashboard-orb-one pointer-events-none fixed" aria-hidden="true" />
      <div className="dashboard-orb dashboard-orb-two pointer-events-none fixed" aria-hidden="true" />

      <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-emerald-300/10 bg-[#07171a]/90 p-5 backdrop-blur-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-7">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border-emerald-300/40 bg-emerald-400/10 text-emerald-300 shadow-[0_0_22px_rgba(52,211,153,0.18)]">
              <Leaf size={21} />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" />
            </div>
            <div>
              <p className="font-mono text-lg tracking-[0.2em] text-white">ARBORIS<span className="text-emerald-300">.X</span></p>
              <p className="font-mono text-[9px] tracking-[0.22em] text-emerald-300/60">URBAN ECOSYSTEM OS</p>
            </div>
          </div>
          <button className="text-slate-400 lg:hidden" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu"><X size={20} /></button>
        </div>

        <div className="mt-8">
          <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Navegação principal</p>
          <nav className="space-y-1" aria-label="Navegação principal">
            {navigation.map(({ label, icon: Icon }) => {
              const isActive = activeSection === label;
              return (
                <button key={label} onClick={() => selectSection(label)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${isActive ? 'border border-emerald-300/20 bg-emerald-400/10 text-emerald-200 shadow-[inset_3px_0_0_#34d399]' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'}`}>
                  <Icon size={17} strokeWidth={isActive ? 2 : 1.6} />
                  <span>{label}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto text-emerald-300" />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto space-y-5">
          <div className="rounded-2xl border-cyan-300/10 bg-cyan-300/[0.04] p-4">
            <div className="mb-3 flex items-center gap-2 text-cyan-300"><Wifi size={15} /><span className="font-mono text-[10px] uppercase tracking-widest">Rede segura</span></div>
            <p className="text-xs leading-relaxed text-slate-400">Todos os nós estão sincronizados com o núcleo Arboris.X.</p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[98%] rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]" /></div>
          </div>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500 transition hover:bg-red-400/10 hover:text-red-300"><LogOut size={17} /> Encerrar sessão</button>
        </div>
      </aside>

      {mobileMenuOpen && <button className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar navegação" />}

      <section className="relative min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b border-white/[0.07] px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <button className="rounded-lg border-white/10 p-2 text-slate-300 lg:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
            <div><p className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-300/70">Terminal / {activeSection}</p><h1 className="mt-1 text-xl font-light text-white sm:text-2xl">Bom dia, Operador.</h1></div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5"><div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-500 sm:flex"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" /> Sistema online</div><button className="relative rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-emerald-300" aria-label="Notificações"><Bell size={19} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-orange-300" /></button><div className="flex h-9 w-9 items-center justify-center rounded-full border-emerald-300/30 bg-emerald-300/10 font-mono text-xs text-emerald-200">AX</div></div>
        </header>

        <div className="mx-auto max-w-[1500px] p-5 sm:p-8 lg:p-10">
          <div className="mb-8 flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">Monitoramento em tempo real</p><h2 className="mt-2 text-3xl font-light tracking-tight text-white">Visão geral <span className="text-emerald-300">/</span> Cidade viva</h2></div><p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Última sincronização: <span className="text-slate-300">agora mesmo</span></p></div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={ThermometerSun} label="Temperatura atual" value="28°C" detail="−3.2°C vs. média urbana" accent="green"><span className="mb-1 text-xs text-emerald-300">↓ 11.4%</span></MetricCard>
            <MetricCard icon={Droplets} label="Umidade do ar" value="68%" detail="Condições ideais para vegetação" accent="cyan"><span className="mb-1 text-xs text-cyan-300">ótimo</span></MetricCard>
            <MetricCard icon={Wifi} label="Rede de sensores" value="Online" detail="42 de 42 sensores respondendo" accent="lime"><span className="mb-2 h-2 w-2 animate-pulse rounded-full bg-lime-300 shadow-[0_0_10px_#bef264]" /></MetricCard>
            <MetricCard icon={CheckCircle2} label="Redução de calor" value="18.6%" detail="Impacto estimado na zona urbana" accent="green"><span className="mb-1 text-xs text-emerald-300">↑ 4.2%</span></MetricCard>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <section className="rounded-2xl border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6"><div className="mb-7 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300/70">Leitura distribuída</p><h3 className="mt-1 text-lg font-light text-white">Temperatura por zona</h3></div><button className="rounded-lg border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-400 hover:border-emerald-300/30 hover:text-emerald-300">24 horas</button></div><div className="relative h-56 overflow-hidden rounded-xl border-white/[0.06] bg-[#061216] p-4"><div className="absolute inset-x-0 top-1/4 border-t border-dashed border-white/[0.06]" /><div className="absolute inset-x-0 top-2/4 border-t border-dashed border-white/[0.06]" /><div className="absolute inset-x-0 top-3/4 border-t border-dashed border-white/[0.06]" /><div className="absolute inset-x-4 bottom-8 top-8 flex items-end gap-1 sm:gap-3">{[42, 48, 43, 58, 52, 67, 62, 75, 68, 71, 64, 78, 73, 81, 76, 84, 79, 86].map((height, index) => <div key={index} className="group relative flex-1"><div style={{ height: `${height}%` }} className="absolute bottom-0 w-full rounded-t-sm bg-gradient-to-t from-emerald-500/20 to-emerald-300/80 shadow-[0_0_12px_rgba(52,211,153,0.35)] transition group-hover:from-cyan-400/30 group-hover:to-cyan-200" /></div>)}</div><div className="absolute bottom-2 left-4 right-4 flex justify-between font-mono text-[9px] text-slate-600"><span>00:00</span><span>06:00</span><span>12:00</span><span>agora</span></div></div></section>

            <section className="rounded-2xl border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">Telemetria</p><h3 className="mt-1 text-lg font-light text-white">Rede de sensores</h3></div><Cpu size={19} className="text-cyan-300/70" /></div><div className="space-y-4">{sensorReadings.map((sensor) => <div key={sensor.name} className="rounded-xl border-white/[0.07] bg-black/10 p-3"><div className="flex items-start justify-between"><div><p className="font-mono text-xs text-slate-200">{sensor.name}</p><p className="mt-1 text-[11px] text-slate-500">{sensor.location}</p></div><span className="flex items-center gap-1 text-[10px] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />{sensor.status}</span></div><div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div style={{ width: `${sensor.level}%` }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-300 shadow-[0_0_8px_rgba(52,211,153,0.5)]" /></div><span className="font-mono text-xs text-white">{sensor.value}</span></div></div>)}</div></section>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-3"><div className="flex items-center gap-4 rounded-2xl border-white/10 bg-white/[0.025] p-4"><CloudRain className="text-cyan-300" size={20} /><div><p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Precipitação</p><p className="mt-1 text-sm text-white">12% nas próximas 6h</p></div></div><div className="flex items-center gap-4 rounded-2xl border-white/10 bg-white/[0.025] p-4"><Leaf className="text-emerald-300" size={20} /><div><p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Impacto Arboris</p><p className="mt-1 text-sm text-white">−18.4t CO₂ este mês</p></div></div><div className="flex items-center gap-4 rounded-2xl border-white/10 bg-white/[0.025] p-4"><Activity className="text-lime-300" size={20} /><div><p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Uptime da rede</p><p className="mt-1 text-sm text-white">99.98% operacional</p></div></div></div>
        </div>
      </section>
    </main>
  );
}
