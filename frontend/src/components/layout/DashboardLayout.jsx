import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ErrorState } from '../ui';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import './layout.css';

export function DashboardLayout({
  activeSection,
  alerts,
  breadcrumbItems,
  children,
  error,
  mobileMenuOpen,
  navigationSection = activeSection,
  notificationsOpen,
  onCloseMobileMenu,
  onCloseNotifications,
  onMarkAllRead,
  onLogout,
  onOpenMobileMenu,
  onSectionChange,
  onToggleNotifications,
  pageTitle,
  regionOptions,
  selectedRegion,
  setSelectedRegion,
}) {
  const dashboardRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo(
        '.workspace-reveal',
        { autoAlpha: 0, y: 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.06,
          ease: 'power2.out',
          clearProps: 'transform,opacity,visibility',
        },
      );
    }, dashboardRef);
    return () => context.revert();
  }, [activeSection]);

  return (
    <main ref={dashboardRef} className="dashboard-shell workspace-shell">
      <div className="dashboard-grid" aria-hidden="true" /><div className="dashboard-orb dashboard-orb-one" aria-hidden="true" /><div className="dashboard-orb dashboard-orb-two" aria-hidden="true" />
      <Sidebar activeSection={navigationSection} isOpen={mobileMenuOpen} onClose={onCloseMobileMenu} onSectionChange={onSectionChange} onLogout={onLogout} />
      {mobileMenuOpen && <button className="workspace-backdrop" onClick={onCloseMobileMenu} aria-label="Fechar menu" />}
      <section className="workspace-main">
        <Header activeSection={activeSection} alerts={alerts} breadcrumbItems={breadcrumbItems} onCloseNotifications={onCloseNotifications} onMarkAllRead={onMarkAllRead} onOpenMobileMenu={onOpenMobileMenu} onToggleNotifications={onToggleNotifications} pageTitle={pageTitle} notificationsOpen={notificationsOpen} regionOptions={regionOptions} selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} />
        <div className="workspace-content">
          {error && <ErrorState message={error} />}
          {children}
          <footer className="workspace-footer"><span>Arboris.X · Inteligência ambiental</span><span>API conectada</span></footer>
        </div>
      </section>
    </main>
  );
}
