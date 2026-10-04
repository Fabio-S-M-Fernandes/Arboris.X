import { useEffect, useState } from 'react';
import { getCurrentUser } from '../services/administrationService';

export function useAdministrationData() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const loadCurrentUser = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getCurrentUser({ signal: controller.signal });
        setCurrentUser(response.user);
      } catch (requestError) {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadCurrentUser();
    return () => controller.abort();
  }, []);

  return { currentUser, error, loading };
}
