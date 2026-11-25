import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HoloBackground from './HoloBackground';

describe('HoloBackground', () => {
  let container;
  let root;
  let previousPerformanceMode;

  afterEach(async () => {
    if (root) await act(async () => { root.unmount(); });
    container?.remove();
    if (previousPerformanceMode === undefined) delete document.documentElement.dataset.performance;
    else document.documentElement.dataset.performance = previousPerformanceMode;
    previousPerformanceMode = undefined;
    vi.unstubAllGlobals();
    root = null;
    container = null;
  });

  it('keeps a forest atmosphere with static light layers and two occasional leaves', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<HoloBackground />);
      await Promise.resolve();
    });

    expect(container.querySelector('.holo-forest')).not.toBeNull();
    expect(container.querySelector('.holo-mist')).not.toBeNull();
    expect(container.querySelectorAll('.holo-floating-leaf')).toHaveLength(2);
    expect([...container.querySelectorAll('.holo-floating-leaf')].map((leaf) => leaf.getAttribute('src'))).toEqual([
      '/ambient/leaf-heart.webp', '/ambient/leaf-lanceolate.webp',
    ]);
  });

  it('keeps only the two lightweight leaves in efficient mode', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    previousPerformanceMode = document.documentElement.dataset.performance;
    document.documentElement.dataset.performance = 'efficient';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<HoloBackground />);
      await Promise.resolve();
    });

    expect(container.querySelector('.holo-forest')).not.toBeNull();
    expect(container.querySelectorAll('.holo-floating-leaf')).toHaveLength(2);
    expect(container.querySelector('.holo-mist')).not.toBeNull();
    expect(container.querySelector('.holo-light-beams')).not.toBeNull();
  });
});
