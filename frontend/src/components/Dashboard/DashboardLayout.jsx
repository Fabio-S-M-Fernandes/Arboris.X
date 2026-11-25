import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowUp, BookOpen, CircleHelp, Cpu, Earth,
  History, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck,
  Thermometer, UserRound, Users, Workflow, X, Mail,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardPreferences } from '../../lib/dashboardPreferences';
import SectionAtmosphere from '../backgrounds/SectionAtmosphere';
import SiteFooterLegal from '../SiteFooterLegal';

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
    { id: 'security', label: 'Segurança', Icon: ShieldCheck },
  ] },
  { title: 'EDUCAÇÃO AMBIENTAL', items: [
    { id: 'quiz', label: 'Quiz ambiental', Icon: Earth },
  ] },
  { title: 'AJUDA E SUPORTE', items: [
    { id: 'faq', label: 'Dúvidas frequentes', Icon: CircleHelp },
    { id: 'contact', label: 'Fale conosco', Icon: Mail },
  ] },
];
const SECTION_LABELS = Object.fromEntries(GROUPS.flatMap((group) => group.items.map((item) => [item.id, item.label])));
SECTION_LABELS.settings = 'Configurações';

function displayName(user) {
  const name = [user?.userMetadata?.full_name, user?.userMetadata?.name]
    .find((value) => typeof value === 'string' && value.trim());
  return name?.trim() || '';
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('pt-BR');
}

const DashboardLayout = forwardRef(function DashboardLayout({
  children, section, sessionUser, motionPaused,
}, ref) {
  const { preferences, updatePreference } = useDashboardPreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarPinnedOpen, setSidebarPinnedOpen] = useState(() => !preferences.sidebarCollapsed);
  const [sidebarTooltip, setSidebarTooltip] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const menuToggleRef = useRef(null);
  const footerRef = useRef(null);
  const sidebarRef = useRef(null);
  const navigationRef = useRef(null);
  const name = displayName(sessionUser);
  const desktopSidebar = viewportWidth > 767;
  const collapsed = desktopSidebar && !sidebarPinnedOpen;
  const hasActiveNavigation = GROUPS.some((group) => group.items.some((item) => item.id === section));
  const closeMenu = () => setMenuOpen(false);
  const toggleDesktopSidebar = () => {
    const nextOpen = !sidebarPinnedOpen;
    setSidebarPinnedOpen(nextOpen);
    updatePreference('sidebarCollapsed', !nextOpen);
    setSidebarTooltip(null);
  };
  const returnToTop = () => {
    const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.motion === 'reduced' ? 'auto' : 'smooth';
    document.querySelector('.dashboard-main')?.scrollTo({ top: 0, behavior });
    window.scrollTo({ top: 0, behavior });
    document.getElementById('dashboard-main-content')?.focus({ preventScroll: true });
  };
  const showSidebarTooltip = (event, label) => {
    if (!collapsed || window.matchMedia?.('(max-width: 767px)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const left = Math.max(12, Math.min(bounds.right + 12, window.innerWidth - 232));
    setSidebarTooltip({ label, top: bounds.top + bounds.height / 2, left });
  };

  useEffect(() => { if (!collapsed) setSidebarTooltip(null); }, [collapsed]);
  useEffect(() => { setSidebarPinnedOpen(!preferences.sidebarCollapsed); }, [preferences.sidebarCollapsed]);

  useEffect(() => { closeMenu(); }, [section]);

  // O botão de retorno só aparece quando o rodapé entra na área visível.
  useEffect(() => {
    const footer = footerRef.current;
    const container = footer?.closest('.dashboard-main');
    if (!footer || !container || typeof IntersectionObserver === 'undefined') {
      setShowBackToTop(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setShowBackToTop(entry.isIntersecting),
      { root: container, threshold: 0.05 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', updateViewportWidth);
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  useEffect(() => {
    const breakpoint = window.matchMedia?.('(min-width: 768px)');
    if (!breakpoint) return undefined;
    const closeOnDesktop = () => { if (breakpoint.matches) closeMenu(); };
    breakpoint.addEventListener('change', closeOnDesktop);
    return () => breakpoint.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const sidebar = sidebarRef.current;
    const menuToggle = menuToggleRef.current;
    // Trava a rolagem do conteúdo (não do body): o dashboard rola em .dashboard-main.
    const scroller = document.querySelector('.dashboard-main');
    scroller?.style.setProperty('overflow', 'hidden');
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
      scroller?.style.removeProperty('overflow');
      document.removeEventListener('keydown', onKeyDown);
      if (menuToggle && getComputedStyle(menuToggle).display !== 'none') menuToggle.focus();
    };
  }, [menuOpen]);

  useLayoutEffect(() => {
    const navigation = navigationRef.current;
    let update;
    let frame = 0;
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update?.();
      });
    };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleUpdate) : null;
    update = () => {
      const active = navigation?.querySelector('[aria-current="page"]');
      if (!active) return;
      const navigationBounds = navigation.getBoundingClientRect();
      const activeBounds = active.getBoundingClientRect();
      const activeTop = activeBounds.top - navigationBounds.top + navigation.scrollTop;
      if (activeBounds.top < navigationBounds.top) {
        navigation.scrollTop -= navigationBounds.top - activeBounds.top;
      } else if (activeBounds.bottom > navigationBounds.bottom) {
        navigation.scrollTop += activeBounds.bottom - navigationBounds.bottom;
      }
      navigation.style.setProperty('--active-top', `${activeTop + 8}px`);
      navigation.style.setProperty('--active-height', `${Math.max(12, active.offsetHeight - 16)}px`);
      observer?.observe(active);
    };
    update();
    if (observer && navigation) {
      observer.observe(navigation);
      const active = navigation.querySelector('[aria-current="page"]');
      if (active) observer.observe(active);
    }
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [section, collapsed, preferences.fontSize]);

  return (
    <div className="dashboard-shell" data-section={section} data-paused={motionPaused} data-collapsed={collapsed} data-menu-open={menuOpen} ref={ref}>
      <a className="dashboard-skip-link" href="#dashboard-main-content">Pular para o conteúdo</a>
      <SectionAtmosphere section={section} />
      <header className="dashboard-header">
        <Link className="dashboard-header__brand" to="/dashboard" aria-label="Arboris.X — escolher seção na navegação" onClick={closeMenu}>
          <span className="dashboard-header__emblem"><img src="/arboris-tree.webp" alt="" width="30" height="30" /></span>
          <span className="dashboard-header__wordmark">ARBORIS<span className="dashboard-brand__accent">.X</span></span>
          <span className="dashboard-header__tagline">Inteligência Ambiental</span>
        </Link> 
        <div className="dashboard-header__actions">
          <span className="dashboard-header__section" aria-hidden="true">{SECTION_LABELS[section] || 'Visão geral'}</span>
          <Link className="dashboard-header__account" to="/dashboard?section=settings" aria-label={`Conta${name ? ` de ${name}` : ''}`} onClick={closeMenu}>
            <span className="dashboard-avatar" aria-hidden="true">{name ? initials(name) : <UserRound size={15} />}</span>
            <span className="dashboard-header__account-name">{name || 'Minha conta'}</span>
          </Link>
          <button
            ref={menuToggleRef}
            className="dashboard-menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Fechar navegação' : 'Abrir navegação'}
            aria-expanded={menuOpen}
            aria-controls="dashboard-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>
      <button className="dashboard-scrim" type="button" aria-label="Fechar menu" tabIndex={-1} onClick={closeMenu} hidden={!menuOpen} />
      <aside
        ref={sidebarRef}
        className="dashboard-sidebar"
        data-open={menuOpen}
        aria-label="Navegação do Arboris.X"
      >
        <div className="dashboard-sidebar__top">
          <Link className="dashboard-sidebar__brand" to="/dashboard" onClick={closeMenu}><img src="/arboris-tree.webp" alt="" width="24" height="24" /><span>ARBORIS<span className="dashboard-brand__accent">.X</span></span></Link>
          <button className="dashboard-sidebar__close" type="button" onClick={closeMenu} aria-label="Fechar navegação"><X size={20} /></button>
        </div>
        {desktopSidebar && (collapsed ? (
          <div className="dashboard-sidebar__dock">
            <button
              className="dashboard-sidebar-toggle dashboard-sidebar-toggle--expand"
              type="button"
              aria-label="Expandir barra lateral"
              aria-expanded="false"
              aria-controls="dashboard-navigation"
              title="Expandir barra lateral"
              onClick={toggleDesktopSidebar}
            ><PanelLeftOpen size={18} aria-hidden="true" /></button>
            <span className="dashboard-sidebar__plant" aria-hidden="true">
              <span className="dashboard-sidebar__plant-leaf" />
            </span>
          </div>
        ) : (
          <div className="dashboard-sidebar__controls">
            <span className="dashboard-sidebar__controls-label" aria-hidden="true"><span className="dashboard-sidebar__mark"><i /></span><span className="dashboard-sidebar__mark-text">PAINEL</span></span>
            <button
              className="dashboard-sidebar-toggle"
              type="button"
              aria-label="Recolher barra lateral"
              aria-expanded="true"
              aria-controls="dashboard-navigation"
              title="Recolher barra lateral"
              onClick={toggleDesktopSidebar}
            ><PanelLeftClose size={18} aria-hidden="true" /></button>
          </div>
        ))}
        <nav ref={navigationRef} className="dashboard-sidebar__navigation" id="dashboard-navigation" aria-label="Navegação principal">
          {hasActiveNavigation && <span className="dashboard-active-indicator" aria-hidden="true" />}
          {GROUPS.map((group) => (
            <div className="dashboard-sidebar__group" key={group.title}>
              <div className="dashboard-sidebar__caption">{group.title}</div>
              <div className="dashboard-nav">
                {group.items.map(({ id, label, Icon }) => {
                  return <Link
                    key={id}
                    className="dashboard-nav__link"
                    to={id === 'overview' ? '/dashboard' : `/dashboard?section=${id}`}
                    aria-label={collapsed ? label : undefined}
                    data-tooltip={collapsed ? label : undefined}
                    aria-current={section === id ? 'page' : undefined}
                    onClick={closeMenu}
                    onMouseEnter={(event) => showSidebarTooltip(event, label)}
                    onMouseLeave={() => setSidebarTooltip(null)}
                    onFocus={(event) => showSidebarTooltip(event, label)}
                    onBlur={() => setSidebarTooltip(null)}
                  >
                    <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>;
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      {sidebarTooltip && <div className="dashboard-sidebar-tooltip" role="tooltip" style={{ top: sidebarTooltip.top, left: sidebarTooltip.left }}>{sidebarTooltip.label}</div>}
      <div className="dashboard-main" inert={menuOpen}>
        <main className="dashboard-main__content" id="dashboard-main-content" tabIndex={-1}>
          <span className="dashboard-route-announcement" role="status" aria-live="polite">Seção: {SECTION_LABELS[section] || 'Visão geral'}</span>
          {children}
        </main>
        <footer className="dashboard-footer" ref={footerRef} data-top-visible={showBackToTop}>
          <div className="dashboard-footer__mark"><img src="/arboris-tree.webp" alt="" width="36" height="36" /><span className="dashboard-footer__brand">ARBORIS<span className="dashboard-brand__accent">.X</span> <span>— Inteligência Ambiental</span></span></div>
          <div className="dashboard-footer__meta"><span className="dashboard-footer__credit">FUNEC Riacho · XIII Mostra de Tecnologia · 2026</span><small className="dashboard-footer__copyright">© {new Date().getFullYear()} Arboris.X. Todos os direitos reservados.</small></div>
          <div className="dashboard-footer__utility">
            <SiteFooterLegal />
          </div>
          <button
            className="dashboard-footer__back-to-top"
            type="button"
            onClick={returnToTop}
            aria-label="Voltar ao topo"
            title="Voltar ao topo"
            tabIndex={showBackToTop ? 0 : -1}
            aria-hidden={showBackToTop ? undefined : 'true'}
          ><ArrowUp size={18} aria-hidden="true" /></button>
        </footer>
      </div>
    </div>
  );
});

export default DashboardLayout;
