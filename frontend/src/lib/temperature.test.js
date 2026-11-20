import { describe, expect, it } from 'vitest';
import { convertTemperature, formatTemperature, temperatureSymbol, toCelsius } from './temperature';

describe('temperature conversion', () => {
  it('uses Celsius as the only base and converts accurately', () => {
    expect(convertTemperature(0, 'F')).toBe(32);
    expect(convertTemperature(100, 'F')).toBe(212);
    expect(convertTemperature(0, 'K')).toBe(273.15);
    expect(toCelsius(212, 'F')).toBe(100);
    expect(toCelsius(273.15, 'K')).toBe(0);
  });

  it('formats Kelvin without a degree symbol and preserves missing values', () => {
    expect(temperatureSymbol('K')).toBe('K');
    expect(formatTemperature(null, 'K')).toBe('—');
    expect(formatTemperature(0, 'C')).toBe('0');
  });
});
