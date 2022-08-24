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
    RefObject
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
    marginTop: 'marginTop'
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
    marginTop: 'marginLeft'
} as const;

const getStyle = (propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS, size: number, marginTop = 0) =>
    ({
        padding: 0,
        margin: 0,
        border: 'none',
        visibility: 'hidden',
        overflowAnchor: 'none',
        [propName.minHeight]: size,
        [propName.height]: size,
        [propName.maxHeight]: size,
        [propName.marginTop]: marginTop
    } as const);

const normalizeValue = (min: number, value: number, max: number) => Math.max(Math.min(value, max), min);

const useIsomorphicLayoutEffect = IS_SSR ? useEffect : useLayoutEffect;

const useRecursiveAnimationFrame = (func: () => void) => {
    const stepRef = useRef(func);

    stepRef.current = func;
    useIsomorphicLayoutEffect(() => {
        let frameId: number;
        const frame = () => {
            frameId = requestAnimationFrame(frame);
            stepRef.current();
        };

        frame();

        return () => cancelAnimationFrame(frameId);
    }, []);
};

export interface ViewportListRef {
    scrollToIndex: (index?: number, alignToTop?: boolean | ScrollIntoViewOptions, offset?: number) => void;
}

export interface ViewportListProps<T> {
    viewportRef?: MutableRefObject<HTMLElement | null> | RefObject<HTMLElement | null>;
    items?: T[];
    itemMinSize?: number;
    margin?: number;
    overscan?: number;
    axis?: 'y' | 'x';
    initialIndex?: number;
    initialAlignToTop?: boolean | ScrollIntoViewOptions;
    initialOffset?: number;
    fixed?: boolean;
    children: (item: T, index: number, array: T[]) => any;
    onViewportIndexesChange?: (viewportIndexes: [number, number]) => void;
    overflowAnchor?: 'none' | 'auto';
}

const ViewportListInner = <T extends any>(
    {
        viewportRef = { current: IS_SSR ? null : document.documentElement },
        items = [],
        itemMinSize = 1,
        margin = 0,
        overscan = 1,
        axis = 'y',
        initialIndex = -1,
        initialAlignToTop = true,
        initialOffset = 0,
        fixed = false,
        children,
        onViewportIndexesChange,
        overflowAnchor = 'auto'
    }: ViewportListProps<T>,
    ref: ForwardedRef<ViewportListRef>
) => {
    const propName = axis === 'y' ? PROP_NAME_FOR_Y_AXIS : PROP_NAME_FOR_X_AXIS;
    const maxIndex = items.length - 1;
    const normalizedItemMinSize = Math.max(1, itemMinSize);
    const itemMinSizeWithMargin = normalizedItemMinSize + margin;
    const overscanSize = Math.ceil(Math.max(0, overscan) * itemMinSizeWithMargin);
    const [indexes, setIndexes] = useState([initialIndex, initialIndex]);
    const startIndex = (indexes[0] = normalizeValue(0, indexes[0], maxIndex));
    const endIndex = (indexes[1] = normalizeValue(startIndex, indexes[1], maxIndex));
    const topSpacerRef = useRef<HTMLDivElement>(null);
    const bottomSpacerRef = useRef<HTMLDivElement>(null);
    const cacheRef = useRef<Array<number>>([]);
    const scrollToIndexRef = useRef<{
        index: number;
        alignToTop: boolean | ScrollIntoViewOptions;
        offset: number;
    } | null>(initialIndex >= 0 ? { index: initialIndex, alignToTop: initialAlignToTop, offset: initialOffset } : null);
    const marginTopRef = useRef(0);
    const viewportIndexesRef = useRef<[number, number]>([-1, -1]);
    const anchorIndexRef = useRef(-1);
    const topSpacerStyle = useMemo(
        () =>
            getStyle(
                propName,
                cacheRef.current
                    .slice(0, startIndex)
                    .reduce((sum, next) => sum + (next - normalizedItemMinSize), startIndex * itemMinSizeWithMargin),
                marginTopRef.current
            ),
        [normalizedItemMinSize, itemMinSizeWithMargin, startIndex, propName]
    );
    const bottomSpacerStyle = useMemo(
        () =>
            getStyle(
                propName,
                cacheRef.current
                    .slice(endIndex + 1, maxIndex + 1)
                    .reduce(
                        (sum, next) => sum + (next - normalizedItemMinSize),
                        itemMinSizeWithMargin * (maxIndex - endIndex)
                    )
            ),
        [propName, endIndex, maxIndex, itemMinSizeWithMargin, normalizedItemMinSize]
    );

    useRecursiveAnimationFrame(() => {
        const viewport = viewportRef.current;
        const topSpacer = topSpacerRef.current;
        const bottomSpacer = bottomSpacerRef.current;

        if (!viewport || !topSpacer || !bottomSpacer) {
            return;
        }

        if (marginTopRef.current && (viewport[propName.scrollTop] <= 0 || startIndex === 0)) {
            topSpacer.style[propName.marginTop] = '0px';
            viewport.style[propName.overflowY] = 'hidden';
            viewport[propName.scrollTop] += -marginTopRef.current;
            viewport.style[propName.overflowY] = '';
            marginTopRef.current = 0;

            return;
        }

        const topElement = topSpacer.nextSibling as Element;
        const bottomElement = bottomSpacer.previousSibling as Element;
        const viewportRect = viewport.getBoundingClientRect();
        const topElementRect = topElement.getBoundingClientRect();
        const bottomElementRect = bottomElement.getBoundingClientRect();
        const topLimit = normalizeValue(0, viewportRect[propName.top], document.documentElement[propName.clientHeight]);
        const bottomLimit = normalizeValue(
            0,
            viewportRect[propName.bottom],
            document.documentElement[propName.clientHeight]
        );
        const topLimitWithOverscanSize = topLimit - overscanSize;
        const bottomLimitWithOverscanSize = bottomLimit + overscanSize;
        const maxItemsCountInViewPort = Math.ceil(
            (bottomLimitWithOverscanSize - topLimitWithOverscanSize) / itemMinSizeWithMargin
        );
        let nextStartIndex = startIndex;
        let nextEndIndex = endIndex;

        if (scrollToIndexRef.current) {
            const targetIndex = normalizeValue(0, scrollToIndexRef.current.index, maxIndex);

            if (targetIndex >= startIndex && targetIndex <= endIndex) {
                let index = startIndex;
                let element: Element | null = topElement;

                while (element && element !== bottomSpacer) {
                    cacheRef.current[index] = element[propName.clientHeight];

                    if (index === targetIndex) {
                        element.scrollIntoView(scrollToIndexRef.current.alignToTop);

                        if (scrollToIndexRef.current.offset) {
                            viewport[propName.scrollTop] += scrollToIndexRef.current.offset;
                        }

                        scrollToIndexRef.current = null;

                        return;
                    }

                    index++;
                    element = element.nextSibling as Element | null;
                }

                return;
            }

            nextStartIndex = targetIndex - maxItemsCountInViewPort;
            nextEndIndex = targetIndex + maxItemsCountInViewPort;
        } else if (fixed) {
            nextStartIndex = Math.floor(
                (topLimitWithOverscanSize - topSpacerRef.current.getBoundingClientRect()[propName.top]) /
                    itemMinSizeWithMargin
            );
            nextEndIndex = nextStartIndex + maxItemsCountInViewPort;
        } else if (topElementRect[propName.top] >= bottomLimitWithOverscanSize) {
            // fast scroll up
            let diff = topElementRect[propName.top] - bottomLimitWithOverscanSize;

            nextEndIndex = startIndex;

            while (diff >= 0 && nextEndIndex > 0) {
                nextEndIndex--;
                diff -= (cacheRef.current[nextEndIndex] || normalizedItemMinSize) + margin;
            }

            nextStartIndex = nextEndIndex - maxItemsCountInViewPort;
        } else if (bottomElementRect[propName.bottom] + margin <= topLimitWithOverscanSize) {
            // fast scroll down
            let diff = topLimitWithOverscanSize - bottomElementRect[propName.bottom] - margin;

            nextStartIndex = endIndex;

            while (diff >= 0 && nextStartIndex < maxIndex) {
                nextStartIndex++;
                diff -= (cacheRef.current[nextStartIndex] || normalizedItemMinSize) + margin;
            }

            nextEndIndex = nextStartIndex + maxItemsCountInViewPort;
        } else {
            if (topElementRect[propName.top] >= topLimitWithOverscanSize) {
                // scroll up
                let diff = topElementRect[propName.top] - topLimitWithOverscanSize;

                while (diff >= 0 && nextStartIndex > 0) {
                    nextStartIndex--;
                    diff -= (cacheRef.current[nextStartIndex] || normalizedItemMinSize) + margin;
                }
            } else if (topElementRect[propName.bottom] + margin < topLimitWithOverscanSize) {
                // scroll down (correction)
                let diff = topLimitWithOverscanSize - topElementRect[propName.bottom] - margin;
                let element = topElement.nextSibling as Element | null;

                while (diff >= 0 && element && element !== bottomSpacer) {
                    nextStartIndex++;
                    cacheRef.current[nextStartIndex] = element[propName.clientHeight];
                    diff -= (cacheRef.current[nextStartIndex] || normalizedItemMinSize) + margin;
                    element = element.nextSibling as Element | null;
                }
            }

            if (bottomElementRect[propName.bottom] + margin <= bottomLimitWithOverscanSize) {
                // scroll down
                let diff = bottomLimitWithOverscanSize - bottomElementRect[propName.bottom] - margin;

                while (diff >= 0 && nextEndIndex < maxIndex) {
                    nextEndIndex++;
                    diff -= (cacheRef.current[nextEndIndex] || normalizedItemMinSize) + margin;
                }
            } else if (bottomElementRect[propName.top] > bottomLimitWithOverscanSize) {
                // scroll up (correction)
                let diff = bottomElementRect[propName.top] - bottomLimitWithOverscanSize;
                let element = bottomElement.previousSibling as Element | null;

                while (diff >= 0 && element && element !== topSpacer) {
                    nextEndIndex--;
                    cacheRef.current[nextEndIndex] = element[propName.clientHeight];
                    diff -= (cacheRef.current[nextEndIndex] || normalizedItemMinSize) + margin;
                    element = element.previousSibling as Element | null;
                }
            }
        }

        if (onViewportIndexesChange) {
            let index = startIndex;
            let element: Element | null = topElement;
            let startViewportIndex = startIndex;

            while (element && element !== bottomSpacer) {
                if (element.getBoundingClientRect()[propName.bottom] > topLimit) {
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
                if (element.getBoundingClientRect()[propName.top] < bottomLimit) {
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
            anchorIndexRef.current = Math.max(nextStartIndex, startIndex);
        }

        if (fixed) {
            cacheRef.current = [];
        } else {
            let index = startIndex;
            let element: Element | null = topElement;

            while (element && index < nextStartIndex && element !== bottomSpacer) {
                cacheRef.current[index] = element[propName.clientHeight];
                index++;
                element = element.nextSibling as Element | null;
            }

            index = endIndex;
            element = bottomElement;

            while (element && index > nextEndIndex && element !== topSpacer) {
                cacheRef.current[index] = element[propName.clientHeight];
                index--;
                element = element.previousSibling as Element | null;
            }
        }

        setIndexes([nextStartIndex, nextEndIndex]);
    });

    useIsomorphicLayoutEffect(() => {
        const anchorIndex = anchorIndexRef.current;

        anchorIndexRef.current = -1;

        const viewport = viewportRef.current;
        const topSpacer = topSpacerRef.current;
        const bottomSpacer = bottomSpacerRef.current;

        if (
            (IS_OVERFLOW_ANCHOR_SUPPORTED && overflowAnchor !== 'none') ||
            anchorIndex === -1 ||
            !viewport ||
            !topSpacer ||
            !bottomSpacer
        ) {
            return;
        }

        const topElement = topSpacer.nextSibling as Element;
        let index = startIndex;
        let element: Element | null = topElement;
        let diff = 0;

        while (element && index < anchorIndex && element !== bottomSpacer) {
            diff += element[propName.clientHeight] - (cacheRef.current[index] || normalizedItemMinSize);
            cacheRef.current[index] = element[propName.clientHeight];
            index++;
            element = element.nextSibling as Element | null;
        }

        if (!diff) {
            return;
        }

        if (IS_TOUCH_DEVICE) {
            marginTopRef.current -= diff;
            topSpacer.style[propName.marginTop] = `${marginTopRef.current}px`;

            return;
        }

        viewport[propName.scrollTop] += diff;
    }, [startIndex]);
    useImperativeHandle(
        ref,
        () => ({
            scrollToIndex: (index = -1, alignToTop = true, offset = 0) => {
                scrollToIndexRef.current = { index, alignToTop, offset };
            }
        }),
        []
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
    props: ViewportListProps<T> & { ref?: ForwardedRef<ViewportListRef> }
) => ReturnType<typeof ViewportListInner>;

// eslint-disable-next-line import/no-default-export
export default ViewportList;
