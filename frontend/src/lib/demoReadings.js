// Sequência reproduzível para apresentação; nunca representa uma medição do aparelho.
export function demoTemperatureCelsius(step) {
  const position = Math.max(0, Math.floor(step));
  return Math.round((29.2 + Math.sin(position * .58) * 2.5 + Math.sin(position * .19) * 1.4) * 10) / 10;
}

export function buildDemoReadings(step, startedAt, count = 12) {
  const first = Math.max(0, step - count + 1);
  return Array.from({ length: step - first + 1 }, (_, index) => {
    const tick = first + index;
    return {
      source: 'demo',
      valueCelsius: demoTemperatureCelsius(tick),
      measuredAt: new Date(startedAt + tick * 8000).toISOString(),
    };
  });
}
