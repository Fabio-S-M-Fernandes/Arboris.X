const REQUEST_TIMEOUT_MS = 8_000;

export const fetchWithTimeout = async (input, init = {}) => {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const upstreamSignal = init.signal;
  const abortFromCaller = () => controller.abort(upstreamSignal.reason);

  if (upstreamSignal?.aborted) abortFromCaller();
  else upstreamSignal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw Object.assign(new Error('A solicitação demorou demais. Tente novamente.'), {
        code: 'REQUEST_TIMEOUT',
        status: 408,
      });
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener('abort', abortFromCaller);
  }
};
