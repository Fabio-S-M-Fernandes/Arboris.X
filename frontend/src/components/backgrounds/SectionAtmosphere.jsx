import { useEffect, useState } from 'react';
import './SectionAtmosphere.css';

export default function SectionAtmosphere({ section }) {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden');
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return (
    <div className="dashboard-atmosphere" data-section={section} data-hidden={hidden} aria-hidden="true" key={section}>
      <span className="dashboard-atmosphere__light" />
      <span className="dashboard-atmosphere__depth" />
    </div>
  );
}
