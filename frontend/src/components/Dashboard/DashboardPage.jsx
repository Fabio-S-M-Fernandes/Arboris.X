import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthTransition } from '../AutenticacaoArboris/AuthTransitionController';
import { useScreenReady } from '../BootGate';
import { clearLocalAuthState } from '../../lib/auth';
import { listTrustedDevices, logoutSupabaseWithApi, revokeTrustedDevice } from '../../lib/api';
import { getAuthCallbackUrl, supabase } from '../../lib/supabase';
import { useDashboardPreferences } from '../../lib/dashboardPreferences';
import { buildDemoReadings } from '../../lib/demoReadings';
import GoogleSignInButton from '../AutenticacaoArboris/GoogleSignInButton';
import DashboardLayout from './DashboardLayout';
import {
  AccountSection,
  HistorySection,
  TemperatureSection,
} from './DashboardSections';
import OverviewSection from './DashboardOverview';
import ContactSection from './ContactSection';
import EcoQuizSection from './EcoQuizSection';
import {
  FAQSection,
  HowItWorksSection,
  ProjectSection,
  SecuritySection,
  TeamSection,
  TechnologySection,
} from './DashboardInstitutionalSections';
import './Dashboard.css';
import './DashboardOverview.css';
import './DashboardHistory.css';

const SECTIONS = new Set([
  'overview', 'temperature', 'history', 'settings',
  'team', 'project', 'how', 'technology', 'security', 'faq', 'contact', 'quiz',
]);
const REAL_READINGS = []; // A integração física ainda não fornece um endpoint de medições.

export default function DashboardPage({ sessionUser }) {
  const { requestTransition, signalDestinationReady, motionPaused } = useAuthTransition();
  const { preferences, updatePreference, restoreDefaults, fontSizes } = useDashboardPreferences();
  const [searchParams] = useSearchParams();
  const shellRef = useRef(null);
  const sectionParam = searchParams.get('section');
  const section = SECTIONS.has(sectionParam) ? sectionParam : 'overview';
  const [deviceState, setDeviceState] = useState({ status: 'loading', available: true, devices: [] });
  const [revokingDevice, setRevokingDevice] = useState(null);
  const [deviceRetry, setDeviceRetry] = useState(0);
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoStartedAt, setDemoStartedAt] = useState(0);
  const [trustNotice] = useState(() => {
    const message = sessionStorage.getItem('arboris-trust-notice') || '';
    sessionStorage.removeItem('arboris-trust-notice');
    return message;
  });
  useScreenReady(shellRef);

  useEffect(() => {
    signalDestinationReady();
  }, [signalDestinationReady]);

  useEffect(() => {
    if (!demoActive) return undefined;
    let timer;
    const syncTimer = () => {
      window.clearInterval(timer);
      if (document.visibilityState === 'visible') {
        timer = window.setInterval(() => setDemoStep((step) => step + 1), 8000);
      }
    };
    document.addEventListener('visibilitychange', syncTimer);
    syncTimer();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', syncTimer);
    };
  }, [demoActive]);

  const toggleDemo = () => {
    if (demoActive) {
      setDemoActive(false);
      setDemoStep(0);
      setDemoStartedAt(0);
    } else {
      setDemoStartedAt(Date.now() - 11 * 8000);
      setDemoStep(11);
      setDemoActive(true);
    }
  };

  const demoReadings = demoActive ? buildDemoReadings(demoStep, demoStartedAt) : [];
  const readings = demoActive ? demoReadings : REAL_READINGS;
  const dataSource = demoActive ? 'demo' : REAL_READINGS.length ? 'real' : 'none';

  useEffect(() => {
    if (section !== 'settings') return undefined;
    let active = true;
    listTrustedDevices().then((result) => {
      if (active) {
        setDeviceState({
          status: 'ready',
          available: result.available === true,
          devices: Array.isArray(result.devices) ? result.devices : [],
        });
      }
    }).catch(() => {
      if (active) setDeviceState((current) => ({ ...current, status: 'error', error: 'Não foi possível carregar os dispositivos. Tente novamente.' }));
    });
    return () => { active = false; };
  }, [deviceRetry, section]);

  const handleDeviceRevoke = async (id) => {
    setRevokingDevice(id);
    try {
      await revokeTrustedDevice(id);
      setDeviceState((current) => ({
        ...current,
        devices: current.devices.filter((device) => device.id !== id),
        error: '',
      }));
    } catch {
      setDeviceState((current) => ({ ...current, error: 'Não foi possível revogar o dispositivo. Tente novamente.' }));
    } finally {
      setRevokingDevice(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutSupabaseWithApi();
    } catch {
      // Supabase signOut still clears its local session if API revocation fails.
    } finally {
      try { await supabase.auth.signOut(); } catch { /* Clear local state below even if Auth is offline. */ }
      clearLocalAuthState({ notify: false });
      requestTransition('/login', { direction: 'reverse', mode: 'auth' });
    }
  };

  const handleGoogleLink = useCallback(async () => {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: getAuthCallbackUrl('link') },
    });
    if (error) throw error;
    return { redirecting: true };
  }, []);

  let content;
  if (section === 'temperature') {
    content = <TemperatureSection readings={readings} dataSource={dataSource} alertCelsius={preferences.alertCelsius} />;
  } else if (section === 'history') {
    content = <HistorySection readings={readings} dataSource={dataSource} />;
  } else if (section === 'team') {
    content = <TeamSection />;
  } else if (section === 'project') {
    content = <ProjectSection />;
  } else if (section === 'how') {
    content = <HowItWorksSection />;
  } else if (section === 'technology') {
    content = <TechnologySection />;
  } else if (section === 'security') {
    content = <SecuritySection />;
  } else if (section === 'faq') {
    content = <FAQSection />;
  } else if (section === 'contact') {
    content = <ContactSection sessionUser={sessionUser} />;
  } else if (section === 'quiz') {
    content = <EcoQuizSection sessionUser={sessionUser} />;
  } else if (section === 'settings') {
    content = (
      <AccountSection
        sessionUser={sessionUser}
        deviceState={deviceState}
        revokingDevice={revokingDevice}
        trustNotice={trustNotice}
        onRevokeDevice={handleDeviceRevoke}
        onRetryDevices={() => {
          setDeviceState((current) => ({ ...current, status: 'loading', error: '' }));
          setDeviceRetry((retry) => retry + 1);
        }}
        preferences={preferences}
        updatePreference={updatePreference}
        restoreDefaults={restoreDefaults}
        fontSizes={fontSizes}
        demoActive={demoActive}
        onToggleDemo={toggleDemo}
        onLogout={handleLogout}
      >
        <GoogleSignInButton onCredential={handleGoogleLink} />
      </AccountSection>
    );
  } else {
    content = <OverviewSection readings={readings} dataSource={dataSource} />;
  }

  return (
    <DashboardLayout
      ref={shellRef}
      section={section}
      sessionUser={sessionUser}
      motionPaused={motionPaused}
    >
      <div className="dashboard-content" key={section}>
        {content}
      </div>
    </DashboardLayout>
  );
}
