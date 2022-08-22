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

const MIN_INDEX = 0;

const IS_TOUCH = (() => {
    try {
        return 'ontouchstart' in window || navigator.maxTouchPoints;
    } catch (error) {
        return false;
    }
})();

const IS_OVERFLOW_ANCHOR_SUPPORTED = (() => {
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
    clientHeight: 'clientWidth',
    scrollHeight: 'scrollWidth',
    scrollTop: 'scrollLeft',
    overflowY: 'overflowX',
    height: 'width',
    minHeight: 'minWidth',
    maxHeight: 'maxWidth',
    marginTop: 'marginLeft'
} as const;

const getStyle = (propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS, size: number, marginTop = 0) =>
    ({
        [propName.minHeight]: size,
        [propName.height]: size,
        [propName.maxHeight]: size,
        overflowAnchor: 'none',
        pointerEvents: 'none',
        userSelect: 'none',
        padding: 0,
        margin: 0,
        border: 'none',
        [propName.marginTop]: marginTop
    } as const);

const normalizeValue = (min: number, value: number, max: number) => Math.max(Math.min(value, max), min);

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const useRequestAnimationFrame = (func: () => void) => {
    const stepRef = useRef(func);

    stepRef.current = func;

    useEffect(() => {
        let frameId: number;
        const frame = (): void => {
            frameId = requestAnimationFrame(frame);
            stepRef.current();
        };

        frame();

        return () => {
            cancelAnimationFrame(frameId);
        };
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
}

const ViewportListInner = <T extends any>(
    {
        viewportRef,
        items = [],
        itemMinSize = 1,
        margin = 0,
        overscan = 1,
        axis = 'y',
        initialIndex = 0,
        initialAlignToTop = true,
        initialOffset = 0,
        fixed = false,
        children,
        onViewportIndexesChange
    }: ViewportListProps<T>,
    ref: ForwardedRef<ViewportListRef>
) => {
    const propName = axis === 'y' ? PROP_NAME_FOR_Y_AXIS : PROP_NAME_FOR_X_AXIS;
    const maxIndex = items.length - 1;
    const normalizedItemMinSize = Math.max(1, itemMinSize);
    const itemMinSizeWithMargin = normalizedItemMinSize + margin;
    const overscanSize = overscan * itemMinSizeWithMargin;
    const normalizedInitialIndex = normalizeValue(MIN_INDEX, initialIndex, maxIndex);
    const [[startIndex, endIndex], setIndexes] = useState([normalizedInitialIndex, normalizedInitialIndex]);
    const normalizedStartIndex = normalizeValue(MIN_INDEX, startIndex, maxIndex);
    const normalizedEndIndex = normalizeValue(normalizedStartIndex, endIndex, maxIndex);
    const topSpacerRef = useRef<HTMLDivElement>(null);
    const bottomSpacerRef = useRef<HTMLDivElement>(null);
    const cacheRef = useRef<Array<number>>([]);
    const scrollToIndexRef = useRef<{
        index: number;
        alignToTop: boolean | ScrollIntoViewOptions;
        offset: number;
    } | null>(
        normalizedStartIndex
            ? { index: normalizedStartIndex, alignToTop: initialAlignToTop, offset: initialOffset }
            : null
    );
    const anchorIndexRef = useRef(-1);
    const marginTopRef = useRef(0);
    const viewportIndexesRef = useRef<[number, number]>([-1, -1]);
    const topSpacerStyle = useMemo(
        () =>
            getStyle(
                propName,
                cacheRef.current
                    .slice(MIN_INDEX, normalizedStartIndex)
                    .reduce(
                        (sum, next) => sum + (next - normalizedItemMinSize),
                        normalizedStartIndex * itemMinSizeWithMargin
                    ),
                marginTopRef.current
            ),
        [normalizedItemMinSize, itemMinSizeWithMargin, normalizedStartIndex, propName]
    );
    const bottomSpacerStyle = useMemo(
        () =>
            getStyle(
                propName,
                cacheRef.current
                    .slice(normalizedEndIndex + 1, maxIndex + 1)
                    .reduce(
                        (sum, next) => sum + (next - normalizedItemMinSize),
                        itemMinSizeWithMargin * (maxIndex - normalizedEndIndex)
                    )
            ),
        [propName, normalizedEndIndex, maxIndex, itemMinSizeWithMargin, normalizedItemMinSize]
    );

    useRequestAnimationFrame(() => {
        const viewport = viewportRef ? viewportRef.current : document.documentElement;
        const topSpacer = topSpacerRef.current;
        const bottomSpacer = bottomSpacerRef.current;

        if (!viewport || !topSpacer || !bottomSpacer) {
            return;
        }

        if (marginTopRef.current && (viewport.scrollTop <= 0 || normalizedStartIndex === 0)) {
            topSpacer.style[propName.marginTop] = '0px';
            viewport.style[propName.overflowY] = 'hidden';
            viewport.scrollTop += -marginTopRef.current;
            viewport.style[propName.overflowY] = '';
            marginTopRef.current = 0;

            return;
        }

        const topElement = topSpacer.nextSibling as Element | null;
        const bottomElement = bottomSpacer.previousSibling as Element | null;

        if (!topElement || !bottomElement) {
            return;
        }

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
        const maxItemsCountInViewPort = normalizeValue(
            0,
            Math.ceil((bottomLimitWithOverscanSize - topLimitWithOverscanSize) / itemMinSizeWithMargin),
            items.length
        );
        let nextStartIndex = normalizedStartIndex;
        let nextEndIndex = normalizedEndIndex;

        if (scrollToIndexRef.current) {
            const targetIndex = normalizeValue(MIN_INDEX, scrollToIndexRef.current.index, maxIndex);

            if (targetIndex >= normalizedStartIndex && targetIndex <= normalizedEndIndex) {
                let index = normalizedStartIndex;
                let element: Element | null = topElement;

                while (element && element !== bottomSpacer) {
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

            nextEndIndex = normalizedStartIndex;

            while (diff >= 0 && nextEndIndex > MIN_INDEX) {
                nextEndIndex--;
                diff -= (cacheRef.current[nextEndIndex] || normalizedItemMinSize) + margin;
            }

            anchorIndexRef.current = normalizedStartIndex;
            nextStartIndex = nextEndIndex - maxItemsCountInViewPort;
        } else if (bottomElementRect[propName.bottom] + margin <= topLimitWithOverscanSize) {
            // fast scroll down
            let diff = topLimitWithOverscanSize - bottomElementRect[propName.bottom] + margin;

            nextStartIndex = normalizedEndIndex;

            while (diff >= 0 && nextStartIndex < maxIndex) {
                nextStartIndex++;
                diff -= (cacheRef.current[nextStartIndex] || normalizedItemMinSize) + margin;
            }

            nextEndIndex = nextStartIndex + maxItemsCountInViewPort;
        } else {
            if (topElementRect[propName.bottom] + margin < topLimitWithOverscanSize) {
                // scroll down (correction)
                nextStartIndex++;
            } else if (topElementRect[propName.top] >= topLimitWithOverscanSize) {
                // scroll up
                let diff = topElementRect[propName.top] - topLimitWithOverscanSize;

                while (diff >= 0 && nextStartIndex > MIN_INDEX) {
                    nextStartIndex--;
                    diff -= (cacheRef.current[nextStartIndex] || normalizedItemMinSize) + margin;
                }

                anchorIndexRef.current = normalizedStartIndex;
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
                nextEndIndex--;
            }
        }

        nextStartIndex = normalizeValue(MIN_INDEX, nextStartIndex, maxIndex);
        nextEndIndex = normalizeValue(nextStartIndex, nextEndIndex, maxIndex);

        if (onViewportIndexesChange) {
            let index = normalizedStartIndex;
            let element: Element | null = topElement;
            let startViewportIndex = normalizedStartIndex;

            while (element && element !== bottomSpacer) {
                if (element.getBoundingClientRect()[propName.bottom] > topLimit) {
                    startViewportIndex = index;

                    break;
                }

                index++;
                element = element.nextSibling as Element | null;
            }

            index = normalizedEndIndex;
            element = bottomElement;

            let endViewportIndex = normalizedEndIndex;

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

        if (nextStartIndex !== normalizedStartIndex || nextEndIndex !== normalizedEndIndex) {
            if (fixed) {
                cacheRef.current = [];
            } else {
                let index = normalizedStartIndex;
                let element: Element | null = topElement;

                while (element && index < nextStartIndex && element !== bottomSpacer) {
                    cacheRef.current[index] = element[propName.clientHeight];
                    index++;
                    element = element.nextSibling as Element | null;
                }

                index = normalizedEndIndex;
                element = bottomElement;

                while (element && index > nextEndIndex && element !== topSpacer) {
                    cacheRef.current[index] = element[propName.clientHeight];
                    index--;
                    element = element.previousSibling as Element | null;
                }
            }

            setIndexes([nextStartIndex, nextEndIndex]);
        }
    });

    useIsomorphicLayoutEffect(() => {
        const anchorIndex = anchorIndexRef.current;

        anchorIndexRef.current = -1;

        const viewport = viewportRef ? viewportRef.current : document.documentElement;
        const topSpacer = topSpacerRef.current;
        const bottomSpacer = bottomSpacerRef.current;

        if (IS_OVERFLOW_ANCHOR_SUPPORTED || anchorIndex === -1 || !viewport || !topSpacer || !bottomSpacer) {
            return;
        }

        const topElement = topSpacer.nextSibling as Element | null;

        if (!topElement) {
            return;
        }

        let index = normalizedStartIndex;
        let element: Element | null = topElement;
        let sizeDiff = 0;

        while (element && index < anchorIndex && element !== bottomSpacer) {
            sizeDiff += element[propName.clientHeight] - (cacheRef.current[index] || normalizedItemMinSize);
            index++;
            element = element.nextSibling as Element | null;
        }

        if (sizeDiff) {
            if (IS_TOUCH) {
                marginTopRef.current -= sizeDiff;
                topSpacer.style[propName.marginTop] = `${marginTopRef.current}px`;
            } else {
                viewport[propName.scrollTop] += sizeDiff;
            }
        }

        anchorIndexRef.current = -1;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [normalizedStartIndex]);

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
            {items
                .slice(normalizedStartIndex, normalizedEndIndex + 1)
                .map((item, index) => children(item, normalizedStartIndex + index, items))}
            <div ref={bottomSpacerRef} style={bottomSpacerStyle} />
        </Fragment>
    );
};

export const ViewportList = forwardRef(ViewportListInner) as <T>(
    props: ViewportListProps<T> & { ref?: ForwardedRef<ViewportListRef> }
) => ReturnType<typeof ViewportListInner>;

// eslint-disable-next-line import/no-default-export
export default ViewportList;
