import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HoloBackground from './HoloBackground';

describe('HoloBackground', () => {
  let container;
  let root;

  afterEach(async () => {
    if (root) await act(async () => { root.unmount(); });
    container?.remove();
    vi.unstubAllGlobals();
    root = null;
    container = null;
  });

  it('keeps the forest atmosphere with three decorative leaf images', async () => {
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
    expect(container.querySelectorAll('.holo-floating-leaf')).toHaveLength(3);
    expect([...container.querySelectorAll('.holo-floating-leaf')].map((leaf) => leaf.getAttribute('src'))).toEqual([
      '/ambient/leaf-heart.webp', '/ambient/leaf-lanceolate.webp', '/ambient/leaf-fern.webp',
    ]);
  });
});
