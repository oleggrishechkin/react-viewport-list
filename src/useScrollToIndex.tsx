import { useRef, Dispatch, useEffect } from 'react';
import { IS_TOUCH_DEVICE, IS_OVERFLOW_ANCHOR_SUPPORTED, PROP_NAME_FOR_Y_AXIS, PROP_NAME_FOR_X_AXIS } from './contants';
import { normalizeValue, findElement } from './utils';

export interface ScrollToIndexOptions {
    index?: number;
    alignToTop?: boolean;
    offset?: number;
    delay?: number;
    prerender?: number;
}

export const useScrollToIndex = ({
    initialIndex,
    initialAlignToTop,
    initialOffset,
    initialDelay,
    initialPrerender,
}: {
    initialIndex: Required<ScrollToIndexOptions>['index'];
    initialAlignToTop: Required<ScrollToIndexOptions>['alignToTop'];
    initialOffset: Required<ScrollToIndexOptions>['offset'];
    initialDelay: Required<ScrollToIndexOptions>['delay'];
    initialPrerender: Required<ScrollToIndexOptions>['prerender'];
}) => {
    const scrollToIndexOptionsRef = useRef<Required<ScrollToIndexOptions> | null>(
        initialIndex >= 0
            ? {
                  index: initialIndex,
                  alignToTop: initialAlignToTop,
                  offset: initialOffset,
                  delay: initialDelay,
                  prerender: initialPrerender,
              }
            : null,
    );
    const timeoutIdRef = useRef<any>(null);
    const isScrollingToIndex = () => !!scrollToIndexOptionsRef.current;
    const initScrollToIndex =
        (frame: () => void) =>
        ({ index = -1, alignToTop = true, offset = 0, delay = -1, prerender = 0 }: ScrollToIndexOptions) => {
            scrollToIndexOptionsRef.current = { index, alignToTop, offset, delay, prerender };
            frame();
        };
    const mainFrame = ({
        propName,
        viewport,
        topElement,
        bottomSpacer,
        startIndex,
        endIndex,
        getItemBoundingClientRect,
        limits,
        setIndexes,
        maxIndex,
    }: {
        propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS;
        viewport: any;
        topElement: Element;
        bottomSpacer: any;
        startIndex: number;
        endIndex: number;
        getItemBoundingClientRect: (element: Element) =>
            | DOMRect
            | {
                  bottom: number;
                  left: number;
                  right: number;
                  top: number;
                  width: number;
                  height: number;
              };
        limits: { [p: string]: number };
        setIndexes: Dispatch<[number, number]>;
        maxIndex: number;
    }) => {
        if (timeoutIdRef.current) {
            return true;
        }

        if (!scrollToIndexOptionsRef.current) {
            return false;
        }

        const targetIndex = normalizeValue(0, scrollToIndexOptionsRef.current.index, maxIndex);

        if (targetIndex < startIndex || targetIndex > endIndex) {
            setIndexes([
                targetIndex - scrollToIndexOptionsRef.current.prerender,
                targetIndex + scrollToIndexOptionsRef.current.prerender,
            ]);

            return true;
        }

        const [targetElement] = findElement({
            fromElement: topElement,
            toElement: bottomSpacer,
            fromIndex: startIndex,
            compare: (_, index) => index === targetIndex,
        });

        if (!targetElement) {
            return true;
        }

        const { alignToTop, offset, delay } = scrollToIndexOptionsRef.current;

        scrollToIndexOptionsRef.current = null;

        const scrollToElement = () => {
            const elementRect = getItemBoundingClientRect(targetElement);
            const shift = alignToTop
                ? elementRect[propName.top] - limits[propName.top] + offset
                : elementRect[propName.bottom] - limits[propName.top] - viewport[propName.clientHeight] + offset;

            viewport[propName.scrollTop] += shift;
            timeoutIdRef.current = null;
        };
        const scrollToElementDelay = delay < 0 && IS_TOUCH_DEVICE && !IS_OVERFLOW_ANCHOR_SUPPORTED ? 30 : delay;

        if (scrollToElementDelay > 0) {
            timeoutIdRef.current = setTimeout(scrollToElement, scrollToElementDelay);

            return true;
        }

        scrollToElement();

        return true;
    };

    useEffect(() => {
        clearTimeout(timeoutIdRef.current);
    }, []);

    return [isScrollingToIndex, initScrollToIndex, mainFrame] as const;
};
