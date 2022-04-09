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
    ForwardedRef
} from 'react';

const MIN_INDEX = 0;

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
    scrollTop: 'scrollTop',
    overflowY: 'overflowY',
    height: 'height',
    minHeight: 'minHeight',
    maxHeight: 'maxHeight'
} as const;

const PROP_NAME_FOR_X_AXIS = {
    top: 'left',
    bottom: 'right',
    clientHeight: 'clientWidth',
    scrollTop: 'scrollLeft',
    overflowY: 'overflowX',
    height: 'width',
    minHeight: 'minWidth',
    maxHeight: 'maxWidth'
} as const;

const getStyle = (propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS, size: number) =>
    ({
        [propName.minHeight]: size,
        [propName.height]: size,
        [propName.maxHeight]: size,
        overflowAnchor: 'none',
        pointerEvents: 'none',
        userSelect: 'none',
        padding: 0,
        margin: 0,
        border: 'none'
    } as const);

const normalizeValue = (min: number, value: number, max: number) => Math.max(Math.min(value, max), min);

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
    scrollToIndex: (index?: number, alignTop?: boolean | ScrollIntoViewOptions) => void;
}

export interface ViewportListProps<T> {
    viewportRef: MutableRefObject<HTMLElement | null>;
    items?: T[];
    itemMinSize: number;
    margin?: number;
    overscan?: number;
    axis?: 'y' | 'x';
    initialIndex?: number;
    initialAlignToTop?: boolean | ScrollIntoViewOptions;
    initialOffset?: number;
    children: (item: T, index: number, array: T[]) => any;
}

const ViewportListInner = <T extends any>(
    {
        viewportRef,
        items = [],
        itemMinSize,
        margin = 0,
        overscan = 1,
        axis = 'y',
        initialIndex = 0,
        initialAlignToTop = true,
        initialOffset = 0,
        children
    }: ViewportListProps<T>,
    ref: ForwardedRef<ViewportListRef>
) => {
    const propName = axis === 'y' ? PROP_NAME_FOR_Y_AXIS : PROP_NAME_FOR_X_AXIS;
    const maxIndex = items.length - 1;
    const itemMinSizeWithMargin = itemMinSize + margin;
    const overscanSize = overscan * itemMinSizeWithMargin;
    const [[startIndex, endIndex], setIndexes] = useState(() => {
        const normalizedInitialIndex = normalizeValue(MIN_INDEX, initialIndex, maxIndex);

        return [normalizedInitialIndex, normalizedInitialIndex];
    });
    const normalizedStartIndex = normalizeValue(MIN_INDEX, startIndex, maxIndex);
    const normalizedEndIndex = normalizeValue(normalizedStartIndex, endIndex, maxIndex);
    const topRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const cacheRef = useRef<Array<number>>([]);
    const scrollToIndexRef = useRef<{
        index: number;
        alignToTop: boolean | ScrollIntoViewOptions;
        offset: number;
    } | null>(startIndex ? { index: startIndex, alignToTop: initialAlignToTop, offset: initialOffset } : null);
    const scrollCompensationEndIndexRef = useRef(-1);
    const topStyle = useMemo(
        () =>
            getStyle(
                propName,
                cacheRef.current
                    .slice(MIN_INDEX, normalizedStartIndex)
                    .reduce((sum, next) => sum + next, normalizedStartIndex * itemMinSizeWithMargin)
            ),
        [normalizedStartIndex, itemMinSizeWithMargin, propName]
    );
    const bottomStyle = useMemo(
        () =>
            getStyle(
                propName,
                cacheRef.current
                    .slice(normalizedEndIndex + 1, maxIndex)
                    .reduce((sum, next) => sum + next, itemMinSizeWithMargin * (maxIndex - normalizedEndIndex))
            ),
        [normalizedEndIndex, maxIndex, itemMinSizeWithMargin, propName]
    );
    const slicedItems = useMemo(
        () =>
            items
                .slice(normalizedStartIndex, normalizedEndIndex + 1)
                .map((item, index) => children(item, normalizedStartIndex + index, items)),
        [items, normalizedStartIndex, normalizedEndIndex, children]
    );

    useRequestAnimationFrame(() => {
        if (
            !viewportRef.current ||
            !topRef.current ||
            !bottomRef.current ||
            !(topRef.current.nextSibling instanceof Element) ||
            !(bottomRef.current.previousSibling instanceof Element)
        ) {
            return;
        }

        const viewportRect = viewportRef.current.getBoundingClientRect();
        const topLimit =
            (viewportRect
                ? normalizeValue(0, viewportRect[propName.top], document.documentElement[propName.clientHeight])
                : 0) - overscanSize;
        const bottomLimit =
            (viewportRect
                ? normalizeValue(0, viewportRect[propName.bottom], document.documentElement[propName.clientHeight])
                : document.documentElement[propName.clientHeight]) + overscanSize;
        const topElementRect = topRef.current.nextSibling.getBoundingClientRect();
        const bottomElementRect = bottomRef.current.previousSibling.getBoundingClientRect();
        const maxItemsCountInViewPort = Math.ceil((bottomLimit - topLimit) / itemMinSizeWithMargin);
        let nextStartIndex = startIndex;
        let nextEndIndex = endIndex;
        let diff;
        let index;
        let element;

        if (scrollToIndexRef.current) {
            const targetIndex = normalizeValue(MIN_INDEX, scrollToIndexRef.current.index, maxIndex);

            if (targetIndex >= startIndex && targetIndex <= endIndex) {
                index = startIndex;
                element = topRef.current.nextSibling;

                while (element instanceof Element && element !== bottomRef.current) {
                    if (index === targetIndex) {
                        element.scrollIntoView(scrollToIndexRef.current.alignToTop);

                        if (scrollToIndexRef.current.offset) {
                            viewportRef.current[propName.scrollTop] += scrollToIndexRef.current.offset;
                        }

                        scrollToIndexRef.current = null;

                        break;
                    }

                    element = element.nextSibling;
                    ++index;
                }

                return;
            }

            nextStartIndex = targetIndex - maxItemsCountInViewPort;
            nextEndIndex = targetIndex + maxItemsCountInViewPort;
        } else if (topElementRect[propName.top] >= bottomLimit) {
            diff = topElementRect[propName.top] - bottomLimit;
            nextEndIndex = startIndex;

            while (diff >= 0 && nextEndIndex > MIN_INDEX) {
                diff -= (cacheRef.current[--nextEndIndex] || 0) + itemMinSizeWithMargin;
            }

            scrollCompensationEndIndexRef.current = startIndex;
            nextStartIndex = nextEndIndex - maxItemsCountInViewPort;
        } else if (bottomElementRect[propName.bottom] + margin <= topLimit) {
            diff = topLimit - bottomElementRect[propName.bottom] + margin;
            nextStartIndex = endIndex;

            while (diff >= 0 && nextStartIndex < maxIndex) {
                diff -= (cacheRef.current[++nextStartIndex] || 0) + itemMinSizeWithMargin;
            }

            nextEndIndex = nextStartIndex + maxItemsCountInViewPort;
        } else {
            if (topElementRect[propName.bottom] + margin < topLimit) {
                ++nextStartIndex;
            } else if (topElementRect[propName.top] >= topLimit) {
                diff = topElementRect[propName.top] - topLimit;

                while (diff >= 0 && nextStartIndex > MIN_INDEX) {
                    diff -= (cacheRef.current[--nextStartIndex] || 0) + itemMinSizeWithMargin;
                }

                scrollCompensationEndIndexRef.current = startIndex;
            }

            if (bottomElementRect[propName.bottom] + margin <= bottomLimit) {
                diff = bottomLimit - bottomElementRect[propName.bottom] - margin;

                while (diff >= 0 && nextEndIndex < maxIndex) {
                    diff -= (cacheRef.current[++nextEndIndex] || 0) + itemMinSizeWithMargin;
                }
            } else if (bottomElementRect[propName.top] > bottomLimit) {
                --nextEndIndex;
            }
        }

        nextStartIndex = normalizeValue(MIN_INDEX, nextStartIndex, maxIndex);
        nextEndIndex = normalizeValue(nextStartIndex, nextEndIndex, maxIndex);

        if (nextStartIndex !== startIndex || nextEndIndex !== endIndex) {
            index = startIndex;
            element = topRef.current.nextSibling;

            while (element instanceof Element && index <= endIndex && element !== bottomRef.current) {
                cacheRef.current[index++] = element[propName.clientHeight] - itemMinSize;
                element = element.nextSibling;
            }

            setIndexes([nextStartIndex, nextEndIndex]);
        }
    });

    useImperativeHandle(
        ref,
        () => ({
            scrollToIndex: (index = -1, alignToTop = true, offset = 0) => {
                scrollToIndexRef.current = { index, alignToTop, offset };
            }
        }),
        []
    );

    useLayoutEffect(() => {
        if (scrollCompensationEndIndexRef.current === -1) {
            return;
        }

        if (!viewportRef || !viewportRef.current || !topRef.current || IS_OVERFLOW_ANCHOR_SUPPORTED) {
            scrollCompensationEndIndexRef.current = -1;

            return;
        }

        let index = startIndex;
        let element = topRef.current.nextSibling;
        let sizeDiff = 0;

        while (
            element instanceof Element &&
            index < scrollCompensationEndIndexRef.current &&
            element !== bottomRef.current
        ) {
            sizeDiff += element[propName.clientHeight] - (cacheRef.current[index] || 0) - itemMinSize;
            element = element.nextSibling;
            ++index;
        }

        if (sizeDiff) {
            viewportRef.current.style[propName.overflowY] = 'hidden';
            viewportRef.current[propName.scrollTop] += sizeDiff;
            viewportRef.current.style[propName.overflowY] = '';
        }

        scrollCompensationEndIndexRef.current = -1;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startIndex]);

    return (
        <Fragment>
            <div key="ViewPortListTop" ref={topRef} style={topStyle} />
            {slicedItems}
            <div key="ViewPortListBottom" ref={bottomRef} style={bottomStyle} />
        </Fragment>
    );
};

const ViewportList = forwardRef(ViewportListInner) as <T>(
    props: ViewportListProps<T> & { ref?: ForwardedRef<ViewportListRef> }
) => ReturnType<typeof ViewportListInner>;

// eslint-disable-next-line import/no-default-export
export default ViewportList;
