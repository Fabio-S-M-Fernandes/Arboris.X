import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, CircleHelp, Cpu, Expand, History,
  LayoutDashboard, Leaf, LogOut, Menu, Minimize, Settings, ShieldCheck,
  Thermometer, Users, Workflow, X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardPreferences } from '../../lib/dashboardPreferences';
import SectionAtmosphere from '../backgrounds/SectionAtmosphere';

const GROUPS = [
  { title: 'MONITORAMENTO', items: [
    { id: 'overview', label: 'Visão geral', Icon: LayoutDashboard },
    { id: 'temperature', label: 'Temperatura', Icon: Thermometer },
    { id: 'history', label: 'Histórico', Icon: History },
  ] },
  { title: 'O PROJETO', items: [
    { id: 'team', label: 'Quem somos', Icon: Users },
    { id: 'project', label: 'Sobre o projeto', Icon: BookOpen },
    { id: 'how', label: 'Como funciona', Icon: Workflow },
    { id: 'technology', label: 'Tecnologias', Icon: Cpu },
  ] },
  { title: 'INFORMAÇÕES', items: [
    { id: 'security', label: 'Segurança', Icon: ShieldCheck },
    { id: 'faq', label: 'Dúvidas frequentes', Icon: CircleHelp },
  ] },
  { title: 'PREFERÊNCIAS', items: [
    { id: 'settings', label: 'Configurações', Icon: Settings },
  ] },
];

const SECTION_TITLES = {
  overview: 'Visão geral', temperature: 'Temperatura', history: 'Histórico',
  team: 'Quem somos', project: 'Sobre o projeto', how: 'Como funciona',
  technology: 'Tecnologias', security: 'Segurança', faq: 'Dúvidas frequentes',
  settings: 'Configurações',
};

const SECTION_DESCRIPTIONS = {
  overview: 'Informações disponíveis sobre o monitoramento ambiental.',
  temperature: 'Acompanhe as leituras de temperatura do aparelho.',
  history: 'Consulte medições registradas quando estiverem disponíveis.',
  team: 'Conheça as pessoas por trás do Arboris.X.',
  project: 'Um projeto sobre ilhas de calor e observação ambiental.',
  how: 'Entenda o que o protótipo faz hoje e o que vem depois.',
  technology: 'As ferramentas usadas para construir o Arboris.X.',
  security: 'Saiba como o acesso à sua conta é protegido.',
  faq: 'Respostas diretas sobre o projeto e a plataforma.',
  settings: 'Gerencie sua conta e suas preferências de visualização.',
};

function displayName(user) {
  return user?.userMetadata?.full_name || user?.userMetadata?.name || user?.email || 'Conta Arboris.X';
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('pt-BR') || 'A';
}

const DashboardLayout = forwardRef(function DashboardLayout({
  children, section, sessionUser, motionPaused, demoActive, presentation,
  onTogglePresentation, onLogout,
}, ref) {
  const { preferences, updatePreference } = useDashboardPreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggleRef = useRef(null);
  const sidebarRef = useRef(null);
  const navigationRef = useRef(null);
  const name = displayName(sessionUser);
  const collapsed = preferences.sidebarCollapsed || presentation;
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => { closeMenu(); }, [section]);

  useEffect(() => {
    const breakpoint = window.matchMedia?.('(min-width: 721px)');
    if (!breakpoint) return undefined;
    const closeOnDesktop = () => { if (breakpoint.matches) closeMenu(); };
    breakpoint.addEventListener('change', closeOnDesktop);
    return () => breakpoint.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const sidebar = sidebarRef.current;
    const menuToggle = menuToggleRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar?.querySelector('#dashboard-navigation a')?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...sidebar.querySelectorAll('a, button:not([disabled])')].filter((item) => item.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (menuToggle && getComputedStyle(menuToggle).display !== 'none') menuToggle.focus();
    };
  }, [menuOpen]);

  useLayoutEffect(() => {
    const navigation = navigationRef.current;
    const update = () => {
      const active = navigation?.querySelector('[aria-current="page"]');
      if (!active) return;
      navigation.style.setProperty('--active-top', `${active.offsetTop + 8}px`);
      navigation.style.setProperty('--active-height', `${Math.max(12, active.offsetHeight - 16)}px`);
    };
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (observer && navigation) observer.observe(navigation);
    return () => observer?.disconnect();
  }, [section, collapsed]);

  return (
    <div className="dashboard-shell" data-section={section} data-paused={motionPaused} data-collapsed={collapsed} data-presentation={presentation} ref={ref}>
      <SectionAtmosphere section={section} />
      <button className="dashboard-scrim" type="button" aria-label="Fechar menu" tabIndex={-1} onClick={closeMenu} hidden={!menuOpen} />
      <aside ref={sidebarRef} className="dashboard-sidebar" data-open={menuOpen} aria-label="Navegação do Arboris.X">
        <div className="dashboard-sidebar__top">
          <Link className="dashboard-brand" to="/dashboard" onClick={closeMenu} aria-label="Arboris.X, visão geral">
            <img src="/arboris-tree.webp" alt="" />
            <span>ARBORIS<span className="dashboard-brand__accent">.X</span></span>
          </Link>
          <button
            className="dashboard-sidebar__collapse"
            type="button"
            aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            aria-expanded={!collapsed}
            aria-controls="dashboard-navigation"
            onClick={() => updatePreference('sidebarCollapsed', !preferences.sidebarCollapsed)}
            disabled={presentation}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
          <button className="dashboard-sidebar__close" type="button" onClick={closeMenu} aria-label="Fechar navegação"><X size={20} /></button>
        </div>
        <nav ref={navigationRef} className="dashboard-sidebar__navigation" id="dashboard-navigation" aria-label="Navegação principal">
          <span className="dashboard-active-indicator" aria-hidden="true" />
          {GROUPS.map((group) => (
            <div className="dashboard-sidebar__group" key={group.title}>
              <div className="dashboard-sidebar__caption">{group.title}</div>
              <div className="dashboard-nav">
                {group.items.map(({ id, label, Icon }) => (
                  <Link
                    key={id}
                    className="dashboard-nav__link"
                    to={id === 'overview' ? '/dashboard' : `/dashboard?section=${id}`}
                    aria-label={collapsed ? label : undefined}
                    title={collapsed ? label : undefined}
                    aria-current={section === id ? 'page' : undefined}
                    onClick={closeMenu}
                  >
                    <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="dashboard-sidebar__bottom">
          <div className="dashboard-sidebar__account" role="group" title={collapsed ? name : undefined} aria-label={`Conta: ${name}`}>
            <span className="dashboard-avatar" aria-hidden="true">{initials(name)}</span>
            <span className="dashboard-sidebar__identity">{name}</span>
          </div>
          <button className="dashboard-nav__link dashboard-nav__logout" type="button" onClick={onLogout} aria-label={collapsed ? 'Sair' : undefined} title={collapsed ? 'Sair' : undefined}>
            <LogOut size={18} strokeWidth={1.8} aria-hidden="true" /><span>Sair</span>
          </button>
        </div>
      </aside>
      <div className="dashboard-main" inert={menuOpen}>
        <header className="dashboard-header">
          <button ref={menuToggleRef} className="dashboard-menu-toggle" type="button" aria-label="Abrir navegação" aria-expanded={menuOpen} aria-controls="dashboard-navigation" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <div className="dashboard-header__titles">
            <span className="dashboard-header__eyebrow"><Leaf size={13} aria-hidden="true" /> MONITORAMENTO AMBIENTAL</span>
            <h1>{SECTION_TITLES[section]}</h1>
            <p>{SECTION_DESCRIPTIONS[section]}</p>
          </div>
          <div className="dashboard-header__controls">
            {demoActive && <span className="dashboard-demo-label">MODO DEMONSTRAÇÃO — DADOS SIMULADOS</span>}
            <div className="dashboard-unit-control" role="group" aria-label="Unidade de temperatura">
              {['C', 'F', 'K'].map((unit) => (
                <button key={unit} type="button" aria-pressed={preferences.unit === unit} onClick={() => updatePreference('unit', unit)}>{unit === 'K' ? 'K' : `°${unit}`}</button>
              ))}
            </div>
            <button className="dashboard-header__action" type="button" aria-pressed={presentation} onClick={onTogglePresentation}>
              {presentation ? <Minimize size={16} /> : <Expand size={16} />}
              <span>{presentation ? 'Sair da apresentação' : 'Modo apresentação'}</span>
            </button>
          </div>
        </header>
        <main className="dashboard-main__content" aria-live="polite">{children}</main>
        <footer className="dashboard-footer"><span>ARBORIS<span className="dashboard-brand__accent">.X</span></span><span>Informações ambientais somente quando houver dados disponíveis.</span></footer>
      </div>
    </div>
  );
});

export default DashboardLayout;
