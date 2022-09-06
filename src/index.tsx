import {
    useState,
    useRef,
    useEffect,
    Fragment,
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    MutableRefObject,
    forwardRef,
    ForwardedRef,
    RefObject,
} from 'react';

const IS_SSR = typeof window === 'undefined';

const IS_TOUCH_DEVICE = IS_SSR
    ? false
    : (() => {
          try {
              return 'ontouchstart' in window || navigator.maxTouchPoints;
          } catch (error) {
              return false;
          }
      })();

const IS_OVERFLOW_ANCHOR_SUPPORTED = IS_SSR
    ? false
    : (() => {
          try {
              return window.CSS.supports('overflow-anchor: auto');
          } catch (error) {
              return false;
          }
      })();

const PROP_NAME_FOR_Y_AXIS = {
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

const PROP_NAME_FOR_X_AXIS = {
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

const getStyle = (propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS, size: number, marginTop = 0) =>
    ({
        padding: 0,
        margin: 0,
        border: 'none',
        visibility: 'hidden',
        // We need to off 'overflow-anchor' for spacers. Otherwise, it may cause unnecessary scroll jumps.
        overflowAnchor: 'none',
        [propName.minHeight]: size,
        [propName.height]: size,
        [propName.maxHeight]: size,
        [propName.marginTop]: marginTop,
    } as const);

const normalizeValue = (min: number, value: number, max = Infinity) => Math.max(Math.min(value, max), min);

const useIsomorphicLayoutEffect = IS_SSR ? useEffect : useLayoutEffect;

export interface ViewportListRef {
    scrollToIndex: (index?: number, alignToTop?: boolean | ScrollIntoViewOptions, offset?: number) => void;
}

export interface ViewportListProps<T> {
    viewportRef?: MutableRefObject<HTMLElement | null> | RefObject<HTMLElement | null>;
    items?: T[];
    // itemMinSize should be 0 or greater. It's estimated item size. Name saved for backward compatibility.
    itemMinSize?: number;
    // Margin should be -1 or greater
    margin?: number;
    overscan?: number;
    axis?: 'y' | 'x';
    initialIndex?: number;
    initialAlignToTop?: boolean | ScrollIntoViewOptions;
    initialOffset?: number;
    children: (item: T, index: number, array: T[]) => any;
    onViewportIndexesChange?: (viewportIndexes: [number, number]) => void;
    overflowAnchor?: 'none' | 'auto';
    withCache?: boolean;
}

const ViewportListInner = <T,>(
    {
        viewportRef = { current: IS_SSR ? null : document.documentElement },
        items = [],
        itemMinSize = 0,
        margin = -1,
        overscan = 1,
        axis = 'y',
        initialIndex = -1,
        initialAlignToTop = true,
        initialOffset = 0,
        children,
        onViewportIndexesChange,
        overflowAnchor = 'auto',
        withCache = true,
    }: ViewportListProps<T>,
    ref: ForwardedRef<ViewportListRef>,
) => {
    const propName = axis === 'y' ? PROP_NAME_FOR_Y_AXIS : PROP_NAME_FOR_X_AXIS;
    const maxIndex = items.length - 1;
    const [[itemHeight, itemMargin], setItemDimensions] = useState(() => [
        normalizeValue(0, itemMinSize),
        normalizeValue(-1, margin),
    ]);
    const itemHeightWithMargin = normalizeValue(0, itemHeight + itemMargin);
    const overscanSize = normalizeValue(0, Math.ceil(overscan * itemHeightWithMargin));
    const [indexes, setIndexes] = useState([initialIndex, initialIndex]);
    const startIndex = (indexes[0] = normalizeValue(0, indexes[0], maxIndex));
    const endIndex = (indexes[1] = normalizeValue(startIndex, indexes[1], maxIndex));
    const topSpacerRef = useRef<HTMLDivElement>(null);
    const bottomSpacerRef = useRef<HTMLDivElement>(null);
    const cacheRef = useRef<number[]>([]);
    const scrollToIndexRef = useRef<{
        index: number;
        alignToTop: boolean | ScrollIntoViewOptions;
        offset: number;
    } | null>(initialIndex >= 0 ? { index: initialIndex, alignToTop: initialAlignToTop, offset: initialOffset } : null);
    const marginTopRef = useRef(0);
    const viewportIndexesRef = useRef<[number, number]>([-1, -1]);
    const anchorElementRef = useRef<Element | null>(null);
    const minAverageSizeRef = useRef(Infinity);
    const stepRef = useRef(() => {});
    const topSpacerStyle = useMemo(
        () =>
            getStyle(
                propName,
                // Array.prototype.reduce() runs only for initialized items.
                cacheRef.current
                    .slice(0, startIndex)
                    .reduce((sum, next) => sum + (next - itemHeight), startIndex * itemHeightWithMargin),
                marginTopRef.current,
            ),
        [propName, startIndex, itemHeightWithMargin, itemHeight],
    );
    const bottomSpacerStyle = useMemo(
        () =>
            getStyle(
                propName,
                // Array.prototype.reduce() runs only for initialized items.
                cacheRef.current
                    .slice(endIndex + 1, maxIndex + 1)
                    .reduce((sum, next) => sum + (next - itemHeight), itemHeightWithMargin * (maxIndex - endIndex)),
            ),
        [propName, endIndex, maxIndex, itemHeightWithMargin, itemHeight],
    );

    stepRef.current = () => {
        const viewport = viewportRef.current;
        const topSpacer = topSpacerRef.current;
        const bottomSpacer = bottomSpacerRef.current;

        if (!viewport || !topSpacer || !bottomSpacer) {
            return;
        }

        const topElement = topSpacer.nextSibling as Element;
        const bottomElement = bottomSpacer.previousSibling as Element;
        const topSecondElement = topElement === bottomSpacer ? bottomSpacer : (topElement.nextSibling as Element);
        const bottomSecondElement =
            bottomElement === topSpacer ? topSpacer : (bottomElement.previousSibling as Element);
        const viewportRect = viewport.getBoundingClientRect();
        const topSpacerRect = topSpacer.getBoundingClientRect();
        const bottomSpacerRect = bottomSpacer.getBoundingClientRect();
        const viewportWithMarginRect = {
            [propName.top]: viewportRect[propName.top] - overscanSize,
            [propName.bottom]: viewportRect[propName.bottom] + overscanSize,
        };

        if (
            (marginTopRef.current < 0 &&
                topSpacerRect[propName.top] - marginTopRef.current >= viewportWithMarginRect[propName.top]) ||
            (marginTopRef.current > 0 && topSpacerRect[propName.top] >= viewportWithMarginRect[propName.top])
        ) {
            topSpacer.style[propName.marginTop] = '0px';
            viewport.style[propName.overflowY] = 'hidden';
            viewport[propName.scrollTop] += -marginTopRef.current;
            viewport.style[propName.overflowY] = '';
            marginTopRef.current = 0;

            return;
        }

        if (itemHeight === 0 || itemMargin === -1) {
            if (topElement === bottomSpacer) {
                return;
            }

            const nextItemHeight = itemHeight === 0 ? (topElement as Element)[propName.clientHeight] : itemHeight;
            const nextItemMargin =
                itemMargin === -1
                    ? bottomSpacerRect[propName.top] - topSpacerRect[propName.bottom] - nextItemHeight
                    : itemMargin;

            setItemDimensions([nextItemHeight, nextItemMargin]);

            return;
        }

        minAverageSizeRef.current = Math.min(
            minAverageSizeRef.current,
            Math.ceil(
                (bottomSpacerRect[propName.top] - topSpacerRect[propName.bottom]) / (endIndex + 1 - startIndex),
            ) || Infinity,
        );

        let nextStartIndex = startIndex;
        let nextEndIndex = endIndex;

        if (scrollToIndexRef.current) {
            if (marginTopRef.current) {
                topSpacer.style[propName.marginTop] = '0px';
                viewport.style[propName.overflowY] = 'hidden';
                viewport[propName.scrollTop] += -marginTopRef.current;
                viewport.style[propName.overflowY] = '';
                marginTopRef.current = 0;

                return;
            }

            const targetIndex = normalizeValue(0, scrollToIndexRef.current.index, maxIndex);

            if (targetIndex < startIndex && targetIndex > endIndex) {
                setIndexes([targetIndex, targetIndex]);

                return;
            }

            let index = startIndex;
            let element: Element | null = topElement;

            while (element && element !== bottomSpacer) {
                if (index === targetIndex) {
                    element.scrollIntoView(scrollToIndexRef.current.alignToTop);

                    if (scrollToIndexRef.current.offset) {
                        viewport[propName.scrollTop] += scrollToIndexRef.current.offset;
                    }

                    scrollToIndexRef.current = null;

                    break;
                }

                index++;
                element = element.nextSibling as Element | null;
            }

            return;
        }

        // If top spacer is intersecting viewport
        if (topSpacerRect[propName.bottom] >= viewportWithMarginRect[propName.top]) {
            const diff = Math.ceil(
                (topSpacerRect[propName.bottom] - viewportWithMarginRect[propName.top]) / minAverageSizeRef.current,
            );

            nextStartIndex -= diff;

            // If bottom second element is not intersecting viewport
            if (
                bottomSecondElement !== topSpacer &&
                bottomSecondElement.getBoundingClientRect()[propName.bottom] > viewportWithMarginRect[propName.bottom]
            ) {
                let index = endIndex;
                let element: Element | null = bottomElement;

                while (element && element !== topSpacer) {
                    if (element.getBoundingClientRect()[propName.bottom] <= viewportWithMarginRect[propName.bottom]) {
                        nextEndIndex = index + 1;

                        break;
                    }

                    index--;
                    element = element.previousSibling as Element | null;
                }

                if (nextEndIndex === endIndex) {
                    nextEndIndex -= diff;
                }
            }
        }

        // If bottom spacer is intersecting viewport
        if (bottomSpacerRect[propName.top] <= viewportWithMarginRect[propName.bottom]) {
            const diff = Math.ceil(
                (viewportWithMarginRect[propName.bottom] - bottomSpacerRect[propName.top]) / minAverageSizeRef.current,
            );

            nextEndIndex += diff;

            // If top second element is not intersecting viewport
            if (
                topSecondElement !== bottomSpacer &&
                topSecondElement.getBoundingClientRect()[propName.top] < viewportWithMarginRect[propName.top]
            ) {
                let index = startIndex;
                let element: Element | null = topElement;

                while (element && element !== bottomSpacer) {
                    if (element.getBoundingClientRect()[propName.top] >= viewportWithMarginRect[propName.top]) {
                        nextStartIndex = index - 1;

                        break;
                    }

                    index++;
                    element = element.nextSibling as Element | null;
                }

                if (nextStartIndex === startIndex) {
                    nextStartIndex += diff;
                }
            }
        }

        if (onViewportIndexesChange) {
            let index = startIndex;
            let element: Element | null = topElement;
            let startViewportIndex = startIndex;

            while (element && element !== bottomSpacer) {
                if (element.getBoundingClientRect()[propName.bottom] > viewportRect[propName.top]) {
                    startViewportIndex = index;

                    break;
                }

                index++;
                element = element.nextSibling as Element | null;
            }

            index = endIndex;
            element = bottomElement;

            let endViewportIndex = endIndex;

            while (element && element !== topSpacer) {
                if (element.getBoundingClientRect()[propName.top] < viewportRect[propName.bottom]) {
                    endViewportIndex = index;

                    break;
                }

                index--;
                element = element.previousSibling as Element | null;
            }

            if (
                startViewportIndex !== viewportIndexesRef.current[0] ||
                endViewportIndex !== viewportIndexesRef.current[1]
            ) {
                viewportIndexesRef.current = [startViewportIndex, endViewportIndex];
                onViewportIndexesChange(viewportIndexesRef.current);
            }
        }

        nextStartIndex = normalizeValue(0, nextStartIndex, maxIndex);
        nextEndIndex = normalizeValue(nextStartIndex, nextEndIndex, maxIndex);

        if (nextStartIndex === startIndex && nextEndIndex === endIndex) {
            return;
        }

        if (nextStartIndex !== startIndex) {
            const anchorIndex = Math.max(nextStartIndex, startIndex);
            let anchorElement: Element | null = null;

            if (anchorIndex === startIndex && anchorIndex <= nextEndIndex) {
                anchorElement = topElement;
            } else if (anchorIndex === nextStartIndex && anchorIndex <= endIndex) {
                let index = startIndex;
                let element: Element | null = topElement;

                while (element && element !== bottomSpacer) {
                    if (index === anchorIndex) {
                        anchorElement = element;

                        break;
                    }

                    if (withCache && element[propName.clientHeight] !== itemHeight) {
                        cacheRef.current[index] = element[propName.clientHeight];
                    }

                    index++;
                    element = element.nextSibling as Element | null;
                }
            }

            anchorElementRef.current = anchorElement;
        }

        setIndexes([nextStartIndex, nextEndIndex]);
    };

    useIsomorphicLayoutEffect(() => {
        let frameId: number;
        const frame = () => {
            frameId = requestAnimationFrame(frame);
            stepRef.current();
        };

        frame();

        return () => cancelAnimationFrame(frameId);
    }, []);

    let anchorScrollTopOnRender: number | undefined;
    let anchorHeightOnRender: number | undefined;

    if (anchorElementRef.current && viewportRef.current && topSpacerRef.current) {
        anchorScrollTopOnRender = viewportRef.current[propName.scrollTop];
        anchorHeightOnRender =
            anchorElementRef.current.getBoundingClientRect()[propName.top] -
            topSpacerRef.current.getBoundingClientRect()[propName.top];
    }

    useIsomorphicLayoutEffect(() => {
        const anchorElement = anchorElementRef.current;

        anchorElementRef.current = null;

        const viewport = viewportRef.current;
        const topSpacer = topSpacerRef.current;

        if (
            (IS_OVERFLOW_ANCHOR_SUPPORTED && overflowAnchor !== 'none') ||
            !anchorElement ||
            !viewport ||
            !topSpacer ||
            anchorScrollTopOnRender === undefined ||
            anchorHeightOnRender === undefined ||
            anchorScrollTopOnRender !== viewport[propName.scrollTop]
        ) {
            return;
        }

        const offset =
            anchorElement.getBoundingClientRect()[propName.top] -
            topSpacer.getBoundingClientRect()[propName.top] -
            anchorHeightOnRender;

        if (!offset) {
            return;
        }

        if (IS_TOUCH_DEVICE) {
            marginTopRef.current -= offset;
            topSpacer.style[propName.marginTop] = `${marginTopRef.current}px`;

            return;
        }

        viewport[propName.scrollTop] += offset;
    }, [startIndex]);

    useImperativeHandle(
        ref,
        () => ({
            scrollToIndex: (index = -1, alignToTop = true, offset = 0) => {
                scrollToIndexRef.current = { index, alignToTop, offset };
            },
        }),
        [],
    );

    return (
        <Fragment>
            <div ref={topSpacerRef} style={topSpacerStyle} />
            {items.slice(startIndex, endIndex + 1).map((item, index) => children(item, startIndex + index, items))}
            <div ref={bottomSpacerRef} style={bottomSpacerStyle} />
        </Fragment>
    );
};

export const ViewportList = forwardRef(ViewportListInner) as <T>(
    props: ViewportListProps<T> & { ref?: ForwardedRef<ViewportListRef> },
) => ReturnType<typeof ViewportListInner>;

// eslint-disable-next-line import/no-default-export
export default ViewportList;
