import { describe, expect, it } from 'bun:test';
import { ImageLightbox } from './image-lightbox.js';
import { installFakeDocument, FakeNode } from './stage-test-dom.js';

describe('ImageLightbox', () => {
  it('opens, cycles zoom mode (Fit -> 100% -> 200% -> Fit), navigates items, and closes', () => {
    const restore = installFakeDocument();
    try {
      const mount = new FakeNode('div');
      const lightbox = new ImageLightbox(mount as unknown as HTMLElement);

      const items = [
        { imageUrl: 'https://example.com/img1.png', title: 'Moment 1' },
        { imageUrl: 'https://example.com/img2.png', title: 'Moment 2' },
      ];

      lightbox.open(items, 0);
      expect(lightbox.host.hidden).toBe(false);

      const img = lightbox.host.querySelector('img') as unknown as HTMLImageElement;
      expect(img.src).toBe('https://example.com/img1.png');

      const zoomBtn = lightbox.host.querySelector('.lightbox-zoom-btn') as unknown as HTMLButtonElement;
      expect(zoomBtn.innerHTML).toContain('Fit');

      // Click Zoom: Fit -> 100%
      zoomBtn.click();
      expect(zoomBtn.innerHTML).toContain('100%');

      // Click Zoom: 100% -> 200%
      zoomBtn.click();
      expect(zoomBtn.innerHTML).toContain('200%');

      // Click Zoom: 200% -> Fit
      zoomBtn.click();
      expect(zoomBtn.innerHTML).toContain('Fit');

      // Navigate Next
      const nextBtn = lightbox.host.querySelectorAll('.lightbox-topbar button')[2] as unknown as HTMLButtonElement;
      nextBtn.click();
      expect(img.src).toBe('https://example.com/img2.png');

      // Close
      lightbox.close();
      expect(lightbox.host.hidden).toBe(true);
    } finally {
      restore();
    }
  });
});
