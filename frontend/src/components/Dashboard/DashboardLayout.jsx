import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight, ArrowUp, BookOpen, ChevronLeft, ChevronRight, CircleHelp, Cpu, Earth,
  History, LayoutDashboard, Menu, Moon, Settings, ShieldCheck, Sun,
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

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 380;
const MAIN_MIN_WIDTH = 480;

function getSidebarMaxWidth(viewportWidth) {
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, viewportWidth - MAIN_MIN_WIDTH));
}

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
  const [sidebarPinnedOpen, setSidebarPinnedOpen] = useState(false);
  const [sidebarTooltip, setSidebarTooltip] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [isResizing, setIsResizing] = useState(false);
  const menuToggleRef = useRef(null);
  const sidebarRef = useRef(null);
  const navigationRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const resizeRef = useRef(null);
  const name = displayName(sessionUser);
  const collapsed = viewportWidth > 720 && !sidebarPinnedOpen;
  const sidebarMaxWidth = getSidebarMaxWidth(viewportWidth);
  const sidebarWidth = collapsed ? 72 : Math.min(preferences.sidebarWidth, sidebarMaxWidth);
  const hasActiveNavigation = GROUPS.some((group) => group.items.some((item) => item.id === section));
  const themeIsLight = preferences.theme === 'light'
    || (preferences.theme === 'auto' && document.documentElement.dataset.theme === 'light');
  const closeMenu = () => setMenuOpen(false);
  const toggleDesktopSidebar = () => {
    setSidebarPinnedOpen((open) => !open);
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
    if (!collapsed || window.matchMedia?.('(max-width: 720px)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const left = Math.max(12, Math.min(bounds.right + 12, window.innerWidth - 232));
    setSidebarTooltip({ label, top: bounds.top + bounds.height / 2, left });
  };

  const syncResizeWidth = (current) => {
    const width = Math.round(current.width);
    current.shell?.style.setProperty('--dashboard-sidebar-width', `${width}px`);
    current.handle?.setAttribute('aria-valuenow', String(width));
    current.handle?.setAttribute('aria-valuetext', `${width} pixels`);
  };

  useEffect(() => { if (!collapsed) setSidebarTooltip(null); }, [collapsed]);

  useEffect(() => { closeMenu(); }, [section]);
  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', updateViewportWidth);
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  const finishResize = (event, releaseCapture = false) => {
    const current = resizeRef.current;
    if (!current || (event && event.pointerId !== current.pointerId)) return;
    if (current.frame) window.cancelAnimationFrame(current.frame);
    syncResizeWidth(current);
    resizeRef.current = null;
    updatePreference('sidebarWidth', current.width);
    setIsResizing(false);
    document.body.style.userSelect = current.previousUserSelect;
    document.body.style.cursor = current.previousCursor;
    if (releaseCapture && resizeHandleRef.current?.hasPointerCapture?.(current.pointerId)) {
      resizeHandleRef.current.releasePointerCapture(current.pointerId);
    }
  };

  useEffect(() => () => {
    const current = resizeRef.current;
    if (!current) return;
    if (current.frame) window.cancelAnimationFrame(current.frame);
    document.body.style.userSelect = current.previousUserSelect;
    document.body.style.cursor = current.previousCursor;
    resizeRef.current = null;
  }, []);

  useEffect(() => {
    if (!isResizing) return undefined;
    const cancelForDrawer = () => {
      if (window.innerWidth > 720) return;
      const current = resizeRef.current;
      if (!current) return;
      if (current.frame) window.cancelAnimationFrame(current.frame);
      syncResizeWidth(current);
      resizeRef.current = null;
      updatePreference('sidebarWidth', current.width);
      setIsResizing(false);
      document.body.style.userSelect = current.previousUserSelect;
      document.body.style.cursor = current.previousCursor;
      if (resizeHandleRef.current?.hasPointerCapture?.(current.pointerId)) {
        resizeHandleRef.current.releasePointerCapture(current.pointerId);
      }
    };
    window.addEventListener('resize', cancelForDrawer);
    return () => window.removeEventListener('resize', cancelForDrawer);
  }, [isResizing, updatePreference]);

  const startResize = (event) => {
    if (collapsed || window.innerWidth <= 720 || event.button !== 0) return;
    event.preventDefault();
    const startingWidth = sidebarWidth;
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: startingWidth,
      width: startingWidth,
      frame: 0,
      shell: event.currentTarget.closest('.dashboard-shell'),
      handle: event.currentTarget,
      previousUserSelect: document.body.style.userSelect,
      previousCursor: document.body.style.cursor,
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    setIsResizing(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveResize = (event) => {
    const current = resizeRef.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const width = Math.min(getSidebarMaxWidth(window.innerWidth), Math.max(
      SIDEBAR_MIN_WIDTH,
      current.startWidth + event.clientX - current.startX,
    ));
    current.width = width;
    current.handle?.setAttribute('aria-valuenow', String(Math.round(width)));
    current.handle?.setAttribute('aria-valuetext', `${Math.round(width)} pixels`);
    if (!current.frame) {
      current.frame = window.requestAnimationFrame(() => {
        current.frame = 0;
        syncResizeWidth(current);
      });
    }
  };

  const resizeByKeyboard = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = (event.shiftKey ? 32 : 12) * (event.key === 'ArrowRight' ? 1 : -1);
    updatePreference('sidebarWidth', Math.min(getSidebarMaxWidth(window.innerWidth), Math.max(
      SIDEBAR_MIN_WIDTH,
      sidebarWidth + delta,
    )));
  };

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
    <div className="dashboard-shell" data-section={section} data-paused={motionPaused} data-collapsed={collapsed} data-resizing={isResizing} style={{ '--dashboard-sidebar-width': `${sidebarWidth}px` }} ref={ref}>
      <a className="dashboard-skip-link" href="#dashboard-main-content">Pular para o conteúdo</a>
      <SectionAtmosphere section={section} />
      <button className="dashboard-scrim" type="button" aria-label="Fechar menu" tabIndex={-1} onClick={closeMenu} hidden={!menuOpen} />
      <aside
        ref={sidebarRef}
        className="dashboard-sidebar"
        data-open={menuOpen}
        aria-label="Navegação do Arboris.X"
      >
        <div className="dashboard-sidebar__top">
          <button className="dashboard-sidebar__close" type="button" onClick={closeMenu} aria-label="Fechar navegação"><X size={20} /></button>
        </div>
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
        <div className="dashboard-sidebar__bottom">
          <button
            className="dashboard-sidebar__theme"
            type="button"
            aria-pressed={themeIsLight}
            aria-label={themeIsLight ? 'Ativar tema escuro' : 'Ativar tema claro'}
            data-tooltip={collapsed ? (themeIsLight ? 'Ativar tema escuro' : 'Ativar tema claro') : undefined}
            onClick={() => updatePreference('theme', themeIsLight ? 'dark' : 'light')}
            onMouseEnter={(event) => showSidebarTooltip(event, themeIsLight ? 'Ativar tema escuro' : 'Ativar tema claro')}
            onMouseLeave={() => setSidebarTooltip(null)}
            onFocus={(event) => showSidebarTooltip(event, themeIsLight ? 'Ativar tema escuro' : 'Ativar tema claro')}
            onBlur={() => setSidebarTooltip(null)}
          >{themeIsLight ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}<span>{themeIsLight ? 'Tema escuro' : 'Tema claro'}</span></button>
          <Link
            className="dashboard-sidebar__account"
            to="/dashboard?section=settings"
            aria-current={section === 'settings' ? 'page' : undefined}
            title={!collapsed && name ? name : undefined}
            aria-label={`Configurações da conta${name ? ` de ${name}` : ''}`}
            data-tooltip={collapsed ? 'Configurações da conta' : undefined}
            onClick={closeMenu}
            onMouseEnter={(event) => showSidebarTooltip(event, 'Configurações da conta')}
            onMouseLeave={() => setSidebarTooltip(null)}
            onFocus={(event) => showSidebarTooltip(event, 'Configurações da conta')}
            onBlur={() => setSidebarTooltip(null)}
          >
            <span className="dashboard-avatar" aria-hidden="true">{name ? initials(name) : <UserRound size={16} />}</span>
            <span className="dashboard-sidebar__identity">{name}</span>
            <Settings className="dashboard-sidebar__account-settings" size={16} aria-hidden="true" />
          </Link>
        </div>
        {!collapsed && <div
          ref={resizeHandleRef}
          className="dashboard-sidebar-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar barra lateral"
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuemax={sidebarMaxWidth}
          aria-valuenow={sidebarWidth}
          aria-valuetext={`${sidebarWidth} pixels`}
          tabIndex={0}
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={(event) => finishResize(event, true)}
          onPointerCancel={(event) => finishResize(event, true)}
          onLostPointerCapture={(event) => finishResize(event)}
          onKeyDown={resizeByKeyboard}
        ><ArrowLeftRight size={13} aria-hidden="true" /></div>}
      </aside>
      {sidebarTooltip && <div className="dashboard-sidebar-tooltip" role="tooltip" style={{ top: sidebarTooltip.top, left: sidebarTooltip.left }}>{sidebarTooltip.label}</div>}
      <button
        className="dashboard-sidebar-toggle"
        type="button"
        aria-label={collapsed ? 'Abrir barra lateral' : 'Fechar barra lateral'}
        aria-expanded={!collapsed}
        aria-controls="dashboard-navigation"
        title={collapsed ? 'Abrir barra lateral' : 'Fechar barra lateral'}
        onClick={toggleDesktopSidebar}
      >{collapsed ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}</button>
      <div className="dashboard-main" inert={menuOpen}>
        <button ref={menuToggleRef} className="dashboard-mobile-menu" type="button" aria-label="Abrir navegação" aria-expanded={menuOpen} aria-controls="dashboard-navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
        <main className="dashboard-main__content" id="dashboard-main-content" tabIndex={-1}>
          <span className="dashboard-route-announcement" role="status" aria-live="polite">Seção: {SECTION_LABELS[section] || 'Visão geral'}</span>
          {children}
        </main>
        <footer className="dashboard-footer">
          <button className="dashboard-footer__back-to-top" type="button" onClick={returnToTop} aria-label="Voltar ao topo" title="Voltar ao topo"><ArrowUp size={22} aria-hidden="true" /></button>
          <div className="dashboard-footer__identity">
            <div className="dashboard-footer__mark"><img src="/arboris-tree.webp" alt="" width="36" height="36" /><span className="dashboard-footer__brand">ARBORIS<span className="dashboard-brand__accent">.X</span> <span>— Inteligência Ambiental</span></span></div>
            <div className="dashboard-footer__meta"><span className="dashboard-footer__credit">FUNEC Riacho · XIII Mostra de Tecnologia · 2026</span><small className="dashboard-footer__copyright">© {new Date().getFullYear()} Arboris.X. Todos os direitos reservados.</small></div>
          </div>
          <div className="dashboard-footer__utility">
            <SiteFooterLegal />
          </div>
        </footer>
      </div>
    </div>
  );
});

export default DashboardLayout;
