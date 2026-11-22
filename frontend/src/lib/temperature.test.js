import { describe, expect, it } from 'vitest';
import { formatTemperature } from './temperature';

describe('temperature formatting in Celsius', () => {
  it('formats a Celsius reading and preserves missing values', () => {
    expect(formatTemperature(23.5)).toBe('23,5');
    expect(formatTemperature(null)).toBe('—');
  });
});
