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
    maxHeight: 'maxHeight'
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
    itemMinSize: number;
    margin?: number;
    overscan?: number;
    axis?: 'y' | 'x';
    initialIndex?: number;
    initialAlignToTop?: boolean | ScrollIntoViewOptions;
    initialOffset?: number;
    fixed?: boolean;
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
        fixed = false,
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
                    .reduce((sum, next) => sum + (next - itemMinSize), normalizedStartIndex * itemMinSizeWithMargin)
            ),
        [itemMinSize, itemMinSizeWithMargin, normalizedStartIndex, propName]
    );
    const bottomStyle = useMemo(
        () =>
            getStyle(
                propName,
                cacheRef.current
                    .slice(normalizedEndIndex + 1, maxIndex)
                    .reduce(
                        (sum, next) => sum + (next - itemMinSize),
                        itemMinSizeWithMargin * (maxIndex - normalizedEndIndex)
                    )
            ),
        [propName, normalizedEndIndex, maxIndex, itemMinSizeWithMargin, itemMinSize]
    );

    useRequestAnimationFrame(() => {
        if (
            !topRef.current ||
            !bottomRef.current ||
            !topRef.current.nextSibling ||
            !bottomRef.current.previousSibling
        ) {
            return;
        }

        const viewport = (viewportRef && viewportRef.current) || document.documentElement;
        const viewportRect = viewport.getBoundingClientRect();
        const topLimit =
            normalizeValue(0, viewportRect[propName.top], document.documentElement[propName.clientHeight]) -
            overscanSize;
        const bottomLimit =
            normalizeValue(0, viewportRect[propName.bottom], document.documentElement[propName.clientHeight]) +
            overscanSize;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const topElementRect = topRef.current.nextSibling.getBoundingClientRect();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const bottomElementRect = bottomRef.current.previousSibling.getBoundingClientRect();
        const maxItemsCountInViewPort = Math.ceil((bottomLimit - topLimit) / itemMinSizeWithMargin);
        let nextStartIndex = startIndex;
        let nextEndIndex = endIndex;

        // If scroll needed
        if (scrollToIndexRef.current) {
            const targetIndex = normalizeValue(MIN_INDEX, scrollToIndexRef.current.index, maxIndex);

            // If our target scroll index is rendered
            if (targetIndex >= startIndex && targetIndex <= endIndex) {
                let index = startIndex;
                let element: ChildNode | null = topRef.current.nextSibling;

                while (element && element !== bottomRef.current) {
                    if (index === targetIndex) {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        element.scrollIntoView(scrollToIndexRef.current.alignToTop);

                        if (
                            scrollToIndexRef.current.offset &&
                            Math.abs(viewport[propName.scrollHeight] - viewport[propName.clientHeight]) < 1
                        ) {
                            viewport[propName.scrollTop] += scrollToIndexRef.current.offset;
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
            // If each item height is fixed
        } else if (fixed) {
            nextStartIndex = Math.floor(
                (topLimit - topRef.current.getBoundingClientRect()[propName.top]) / itemMinSizeWithMargin
            );
            nextEndIndex = nextStartIndex + maxItemsCountInViewPort;
            // If first rendered item is below bottom
        } else if (topElementRect[propName.top] >= bottomLimit) {
            let diff = topElementRect[propName.top] - bottomLimit;

            nextEndIndex = startIndex;

            while (diff >= 0 && nextEndIndex > MIN_INDEX) {
                diff -= (cacheRef.current[--nextEndIndex] || itemMinSize) + margin;
            }

            scrollCompensationEndIndexRef.current = startIndex;
            nextStartIndex = nextEndIndex - maxItemsCountInViewPort;
            // If last rendered item is above top
        } else if (bottomElementRect[propName.bottom] + margin <= topLimit) {
            let diff = topLimit - bottomElementRect[propName.bottom] + margin;

            nextStartIndex = endIndex;

            while (diff >= 0 && nextStartIndex < maxIndex) {
                diff -= (cacheRef.current[++nextStartIndex] || itemMinSize) + margin;
            }

            nextEndIndex = nextStartIndex + maxItemsCountInViewPort;
        } else {
            // If first rendered item is above top
            if (topElementRect[propName.bottom] + margin < topLimit) {
                ++nextStartIndex;
                // If first rendered item is below top
            } else if (topElementRect[propName.top] >= topLimit) {
                let diff = topElementRect[propName.top] - topLimit;

                while (diff >= 0 && nextStartIndex > MIN_INDEX) {
                    diff -= (cacheRef.current[--nextStartIndex] || itemMinSize) + margin;
                }

                scrollCompensationEndIndexRef.current = startIndex;
            }

            // If last rendered item is above bottom
            if (bottomElementRect[propName.bottom] + margin <= bottomLimit) {
                let diff = bottomLimit - bottomElementRect[propName.bottom] - margin;

                while (diff >= 0 && nextEndIndex < maxIndex) {
                    diff -= (cacheRef.current[++nextEndIndex] || itemMinSize) + margin;
                }
                // If last rendered item is below bottom
            } else if (bottomElementRect[propName.top] > bottomLimit) {
                --nextEndIndex;
            }
        }

        nextStartIndex = normalizeValue(MIN_INDEX, nextStartIndex, maxIndex);
        nextEndIndex = normalizeValue(nextStartIndex, nextEndIndex, maxIndex);

        if (nextStartIndex !== startIndex || nextEndIndex !== endIndex) {
            if (fixed) {
                cacheRef.current = [];
            } else {
                let index = startIndex;
                let element: ChildNode | null = topRef.current.nextSibling;

                while (element && index < nextStartIndex && element !== bottomRef.current) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    cacheRef.current[index++] = element[propName.clientHeight];
                    element = element.nextSibling;
                }

                index = endIndex;
                element = bottomRef.current.previousSibling;

                while (element && index > nextEndIndex && element !== topRef.current) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    cacheRef.current[index++] = element[propName.clientHeight];
                    element = element.previousSibling;
                }
            }

            setIndexes([nextStartIndex, nextEndIndex]);
        }
    });

    useIsomorphicLayoutEffect(() => {
        if (scrollCompensationEndIndexRef.current === -1) {
            return;
        }

        if (!topRef.current || !topRef.current.nextSibling || IS_OVERFLOW_ANCHOR_SUPPORTED) {
            scrollCompensationEndIndexRef.current = -1;

            return;
        }

        const viewport = (viewportRef && viewportRef.current) || document.documentElement;
        let index = startIndex;
        let element: ChildNode | null = topRef.current.nextSibling;
        let sizeDiff = 0;

        while (element && index < scrollCompensationEndIndexRef.current && element !== bottomRef.current) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            sizeDiff += element[propName.clientHeight] - (cacheRef.current[index] || itemMinSize);
            element = element.nextSibling;
            ++index;
        }

        if (sizeDiff && Math.abs(viewport[propName.scrollHeight] - viewport[propName.clientHeight]) < 1) {
            viewport.style[propName.overflowY] = 'hidden';
            viewport[propName.scrollTop] += sizeDiff;
            viewport.style[propName.overflowY] = '';
        }

        scrollCompensationEndIndexRef.current = -1;
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <div ref={topRef} style={topStyle} />
            {items.slice(startIndex, endIndex + 1).map((item, index) => children(item, startIndex + index, items))}
            <div ref={bottomRef} style={bottomStyle} />
        </Fragment>
    );
};

export const ViewportList = forwardRef(ViewportListInner) as <T>(
    props: ViewportListProps<T> & { ref?: ForwardedRef<ViewportListRef> }
) => ReturnType<typeof ViewportListInner>;

// eslint-disable-next-line import/no-default-export
export default ViewportList;
