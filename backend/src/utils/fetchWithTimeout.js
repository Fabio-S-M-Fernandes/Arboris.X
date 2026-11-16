const REQUEST_TIMEOUT_MS = 10_000;

const fetchWithTimeout = (input, init = {}) => fetch(input, {
  ...init,
  signal: init.signal || AbortSignal.timeout(REQUEST_TIMEOUT_MS),
});

module.exports = fetchWithTimeout;
