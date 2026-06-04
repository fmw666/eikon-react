import type { DevicePlatform } from '../device-shell';

const SCROLLBAR_STYLE_ID = 'eikon-device-scrollbar';

export function getDeviceScrollbarCSS(platform: DevicePlatform): string {
  // `overscroll-behavior: contain` stops the iframe's wheel/touch scrolls
  // from chaining into the playground page once the inner document hits
  // a boundary. Without it, scrolling to the bottom of any preview route
  // (e.g. /examples/*) would silently start scrolling the workbench /
  // landing page underneath — see the comment thread on this regression.
  // Browsers consult the scrolling element's value, so we set it on both
  // `html` and `body` to cover document-vs-body quirks across engines.
  const overscrollGuard = `
    html, body {
      overscroll-behavior: contain;
    }
  `;
  if (platform === 'mobile') {
    return `
      ${overscrollGuard}
      html, body, * {
        scrollbar-width: none !important;
      }
      ::-webkit-scrollbar {
        display: none !important;
      }
    `;
  }
  if (platform === 'desktop') {
    return `
      ${overscrollGuard}
      * { scrollbar-width: thin; scrollbar-color: rgba(120,120,128,0.3) transparent; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb {
        background: rgba(120,120,128,0.25);
        border-radius: 999px;
        border: 1.5px solid transparent;
        background-clip: padding-box;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(120,120,128,0.5);
        border: 1.5px solid transparent;
        background-clip: padding-box;
      }
      ::-webkit-scrollbar-corner { background: transparent; }
    `;
  }
  // web — Chrome style
  return `
    ${overscrollGuard}
    * { scrollbar-width: thin; scrollbar-color: rgba(100,100,110,0.35) rgba(240,240,240,0.4); }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: rgba(240,240,242,0.5); border-radius: 999px; }
    ::-webkit-scrollbar-thumb {
      background: rgba(100,100,110,0.3);
      border-radius: 999px;
      border: 2px solid transparent;
      background-clip: padding-box;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(100,100,110,0.55);
      border: 2px solid transparent;
      background-clip: padding-box;
    }
    ::-webkit-scrollbar-corner { background: transparent; }
  `;
}

export function injectScrollbarStyle(
  iframe: HTMLIFrameElement,
  platform: DevicePlatform
): void {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return;
    let style = doc.getElementById(SCROLLBAR_STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement('style');
      style.id = SCROLLBAR_STYLE_ID;
      doc.head.appendChild(style);
    }
    style.textContent = getDeviceScrollbarCSS(platform);
  } catch {
    // Cross-origin or iframe not ready — silently skip
  }
}
