// jest-dom adds custom matchers for asserting on DOM nodes,
// e.g. expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';

// jsdom 沒有 matchMedia，antd 的響應式元件需要它
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// jsdom 也沒有 ResizeObserver，antd 的 Tabs / Table 會用到
window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom 不支援帶 pseudo-element 參數的 getComputedStyle（antd Table 量測捲軸時會呼叫），忽略該參數避免雜訊
const { getComputedStyle } = window;
window.getComputedStyle = (element: Element) => getComputedStyle(element);
