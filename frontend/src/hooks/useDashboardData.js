import { useCallback, useEffect, useState } from 'react';
import {
  getDashboardBaseData,
  getDashboardSummary,
  getDashboardTrend,
  markAllDashboardAlertsAsRead,
} from '../services/dashboardService';

export function useDashboardData({ region, period, measure }) {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [zones, setZones] = useState([]);
  const [baseLoading, setBaseLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [baseError, setBaseError] = useState('');
  const [summaryError, setSummaryError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const loadBaseData = async () => {
      setBaseLoading(true);
      setBaseError('');
      try {
        const [sensorResponse, alertResponse, zoneResponse] = await getDashboardBaseData({ signal: controller.signal });
        setSensors(sensorResponse.data);
        setAlerts(alertResponse.data);
        setZones(zoneResponse.data);
      } catch (requestError) {
        if (requestError.name !== 'AbortError') setBaseError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setBaseLoading(false);
      }
    };

    loadBaseData();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadSummaryAndTrend = async () => {
      setSummaryLoading(true);
      setSummaryError('');
      try {
        const [summaryResponse, trendResponse] = await Promise.all([
          getDashboardSummary(region, { signal: controller.signal }),
          getDashboardTrend(region, period, measure, { signal: controller.signal }),
        ]);
        setSummary(summaryResponse);
        setTrend(trendResponse);
      } catch (requestError) {
        if (requestError.name !== 'AbortError') setSummaryError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setSummaryLoading(false);
      }
    };

    loadSummaryAndTrend();
    return () => controller.abort();
  }, [measure, period, region]);

  const markAllAlertsAsRead = useCallback(async () => {
    try {
      await markAllDashboardAlertsAsRead();
      setAlerts((currentAlerts) => currentAlerts.map((alert) => ({ ...alert, naoLido: false })));
    } catch (requestError) {
      setSummaryError(requestError.message);
    }
  }, []);

  return {
    alerts,
    baseLoading,
    baseError,
    error: baseError || summaryError,
    markAllAlertsAsRead,
    sensors,
    summary,
    summaryLoading,
    summaryError,
    trend,
    zones,
  };
}
