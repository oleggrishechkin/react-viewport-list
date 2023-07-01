export const IS_SSR = typeof window === 'undefined';

export const IS_TOUCH_DEVICE =
    !IS_SSR &&
    (() => {
        try {
            return 'ontouchstart' in window || navigator.maxTouchPoints;
        } catch {
            return false;
        }
    })();

export const IS_OVERFLOW_ANCHOR_SUPPORTED =
    !IS_SSR &&
    (() => {
        try {
            return window.CSS.supports('overflow-anchor: auto');
        } catch {
            return false;
        }
    })();

export const PROP_NAME_FOR_Y_AXIS = {
    top: 'top',
    bottom: 'bottom',
    clientHeight: 'clientHeight',
    scrollHeight: 'scrollHeight',
    scrollTop: 'scrollTop',
    overflowY: 'overflowY',
    height: 'height',
    minHeight: 'minHeight',
    maxHeight: 'maxHeight',
    marginTop: 'marginTop',
} as const;

export const PROP_NAME_FOR_X_AXIS = {
    top: 'left',
    bottom: 'right',
    scrollHeight: 'scrollWidth',
    clientHeight: 'clientWidth',
    scrollTop: 'scrollLeft',
    overflowY: 'overflowX',
    minHeight: 'minWidth',
    height: 'width',
    maxHeight: 'maxWidth',
    marginTop: 'marginLeft',
} as const;

export const SCROLLABLE_REGEXP = /auto|scroll/gi;
