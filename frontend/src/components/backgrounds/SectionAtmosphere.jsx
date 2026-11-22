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
    <div className="dashboard-atmosphere" data-section={section} data-hidden={hidden} aria-hidden="true">
      <span className="dashboard-atmosphere__light" />
      <span className="dashboard-atmosphere__depth" />
      <span className="dashboard-atmosphere__thermal" />
      {section === 'quiz' && <div className="dashboard-atmosphere__quiz-scenes">
        {[0, 1, 2, 3, 4].map((stage) => <span key={stage} data-stage={stage} />)}
      </div>}
    </div>
  );
}
