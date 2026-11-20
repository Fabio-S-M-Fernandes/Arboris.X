import { describe, expect, it } from 'vitest';
import { buildDemoReadings, demoTemperatureCelsius } from './demoReadings';

describe('isolated demonstration data', () => {
  it('produces reproducible values with explicit source metadata', () => {
    expect(demoTemperatureCelsius(8)).toBe(demoTemperatureCelsius(8));
    const readings = buildDemoReadings(16, Date.UTC(2026, 10, 19));
    expect(readings).toHaveLength(12);
    expect(readings.every((reading) => reading.source === 'demo')).toBe(true);
    expect(readings.at(-1).valueCelsius).toBe(demoTemperatureCelsius(16));
  });
});
