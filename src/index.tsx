import {
    useState,
    useRef,
    useEffect,
    Fragment,
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    MutableRefObject,
    ReactNode,
    forwardRef
} from 'react';

const MIN_INDEX = 0;

const IS_OVERFLOW_ANCHOR_SUPPORTED = (() => {
    try {
        return window.CSS.supports('overflow-anchor: auto');
    } catch (error) {
        return false;
    }
})();

const normalizeValue = (min: number, value: number, max: number) => Math.max(Math.min(value, max), min);

export type Axis = 'x' | 'y';

interface Style {
    minHeight?: number;
    height?: number;
    maxHeight?: number;
    minWidth?: number;
    width?: number;
    maxWidth?: number;
    overflowAnchor: 'none';
    pointerEvents: 'none';
    userSelect: 'none';
    padding: 0;
    margin: 0;
    border: 'none';
}

interface PropName {
    top: 'top' | 'left';
    bottom: 'bottom' | 'right';
    clientHeight: 'clientHeight' | 'clientWidth';
    scrollTop: 'scrollTop' | 'scrollLeft';
    overflowY: 'overflowY' | 'overflowX';
    height: 'height' | 'width';
    minHeight: 'minHeight' | 'minWidth';
    maxHeight: 'maxHeight' | 'maxWidth';
}

const getPropName = (axis: Axis): PropName => ({
    top: axis === 'y' ? 'top' : 'left',
    bottom: axis === 'y' ? 'bottom' : 'right',
    clientHeight: axis === 'y' ? 'clientHeight' : 'clientWidth',
    scrollTop: axis === 'y' ? 'scrollTop' : 'scrollLeft',
    overflowY: axis === 'y' ? 'overflowY' : 'overflowX',
    height: axis === 'y' ? 'height' : 'width',
    minHeight: axis === 'y' ? 'minHeight' : 'minWidth',
    maxHeight: axis === 'y' ? 'maxHeight' : 'maxWidth'
});

const getStyleFabric = (propName: PropName) => (size: number): Style => ({
    [propName.minHeight]: size,
    [propName.height]: size,
    [propName.maxHeight]: size,
    overflowAnchor: 'none',
    pointerEvents: 'none',
    userSelect: 'none',
    padding: 0,
    margin: 0,
    border: 'none'
});

export interface ViewportListRef {
    scrollToIndex: (index?: number, alignTop?: boolean | ScrollIntoViewOptions) => void;
}

export interface ViewportListProps {
    viewportRef: MutableRefObject<HTMLElement | null>;
    items?: Array<any>;
    itemMinSize: number;
    margin?: number;
    overscan?: number;
    axis?: Axis;
    initialIndex?: number;
    initialAlignToTop?: boolean | ScrollIntoViewOptions;
    children: (item: any, index: number) => ReactNode;
}

const ViewportList = forwardRef<ViewportListRef, ViewportListProps>(
    (
        {
            viewportRef,
            items = [],
            itemMinSize,
            margin = 0,
            overscan = 1,
            axis = 'y',
            initialIndex = 0,
            initialAlignToTop = true,
            children
        },
        ref
    ) => {
        const propName = useMemo(() => getPropName(axis), [axis]);
        const getStyle = useMemo(() => getStyleFabric(propName), [propName]);
        const maxIndex = items.length - 1;
        const itemMinSizeWithMargin = itemMinSize + margin;
        const overscanSize = overscan * itemMinSizeWithMargin;
        const [[startIndex, endIndex], setIndexes] = useState<[number, number]>(() => {
            const normalizedInitialIndex = normalizeValue(MIN_INDEX, initialIndex, maxIndex);

            return [normalizedInitialIndex, normalizedInitialIndex];
        });
        const topRef = useRef<HTMLDivElement>(null);
        const bottomRef = useRef<HTMLDivElement>(null);
        const step = useRef(() => {});
        const cache = useRef<Array<number>>([]);
        const scrollToIndex = useRef<{ index: number; alignToTop: boolean | ScrollIntoViewOptions } | null>(
            startIndex ? { index: startIndex, alignToTop: initialAlignToTop } : null
        );
        const scrollCompensationEndIndex = useRef(-1);
        const normalizedStartIndex = normalizeValue(MIN_INDEX, startIndex, maxIndex);
        const normalizedEndIndex = normalizeValue(normalizedStartIndex, endIndex, maxIndex);
        const topStyle = useMemo<Style>(
            () =>
                getStyle(
                    cache.current
                        .slice(MIN_INDEX, normalizedStartIndex)
                        .reduce((sum, next) => sum + next, normalizedStartIndex * itemMinSizeWithMargin)
                ),
            [normalizedStartIndex, itemMinSizeWithMargin, getStyle]
        );
        const bottomStyle = useMemo<Style>(
            () =>
                getStyle(
                    cache.current
                        .slice(normalizedEndIndex + 1, maxIndex)
                        .reduce((sum, next) => sum + next, itemMinSizeWithMargin * (maxIndex - normalizedEndIndex))
                ),
            [normalizedEndIndex, maxIndex, itemMinSizeWithMargin, getStyle]
        );
        const slicedItems = useMemo<Array<ReactNode>>(
            () =>
                items
                    .slice(normalizedStartIndex, normalizedEndIndex + 1)
                    .map((item, index) => children(item, normalizedStartIndex + index)),
            [items, normalizedStartIndex, normalizedEndIndex, children]
        );

        step.current = () => {
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

            if (scrollToIndex.current) {
                const targetIndex = normalizeValue(MIN_INDEX, scrollToIndex.current.index, maxIndex);

                if (targetIndex >= startIndex && targetIndex <= endIndex) {
                    index = startIndex;
                    element = topRef.current.nextSibling;

                    while (element instanceof Element && element !== bottomRef.current) {
                        if (index === targetIndex) {
                            element.scrollIntoView(scrollToIndex.current.alignToTop);
                            scrollToIndex.current = null;

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
                    diff -= (cache.current[--nextEndIndex] || 0) + itemMinSizeWithMargin;
                }

                scrollCompensationEndIndex.current = startIndex;
                nextStartIndex = nextEndIndex - maxItemsCountInViewPort;
            } else if (bottomElementRect[propName.bottom] + margin <= topLimit) {
                diff = topLimit - bottomElementRect[propName.bottom] + margin;
                nextStartIndex = endIndex;

                while (diff >= 0 && nextStartIndex < maxIndex) {
                    diff -= (cache.current[++nextStartIndex] || 0) + itemMinSizeWithMargin;
                }

                nextEndIndex = nextStartIndex + maxItemsCountInViewPort;
            } else {
                if (topElementRect[propName.bottom] + margin < topLimit) {
                    ++nextStartIndex;
                } else if (topElementRect[propName.top] >= topLimit) {
                    diff = topElementRect[propName.top] - topLimit;

                    while (diff >= 0 && nextStartIndex > MIN_INDEX) {
                        diff -= (cache.current[--nextStartIndex] || 0) + itemMinSizeWithMargin;
                    }

                    scrollCompensationEndIndex.current = startIndex;
                }

                if (bottomElementRect[propName.bottom] + margin <= bottomLimit) {
                    diff = bottomLimit - bottomElementRect[propName.bottom] - margin;

                    while (diff >= 0 && nextEndIndex < maxIndex) {
                        diff -= (cache.current[++nextEndIndex] || 0) + itemMinSizeWithMargin;
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
                    cache.current[index++] = element[propName.clientHeight] - itemMinSize;
                    element = element.nextSibling;
                }

                setIndexes([nextStartIndex, nextEndIndex]);
            }
        };

        useImperativeHandle(
            ref,
            () => ({
                scrollToIndex: (index = -1, alignToTop = true) => {
                    scrollToIndex.current = { index, alignToTop };
                }
            }),
            []
        );

        useLayoutEffect(() => {
            if (scrollCompensationEndIndex.current === -1) {
                return;
            }

            if (!viewportRef || !viewportRef.current || !topRef.current || IS_OVERFLOW_ANCHOR_SUPPORTED) {
                scrollCompensationEndIndex.current = -1;

                return;
            }

            let index = startIndex;
            let element = topRef.current.nextSibling;
            let sizeDiff = 0;

            while (
                element instanceof Element &&
                index < scrollCompensationEndIndex.current &&
                element !== bottomRef.current
            ) {
                sizeDiff += element[propName.clientHeight] - (cache.current[index] || 0) - itemMinSize;
                element = element.nextSibling;
                ++index;
            }

            if (sizeDiff) {
                viewportRef.current.style[propName.overflowY] = 'hidden';
                viewportRef.current[propName.scrollTop] += sizeDiff;
                viewportRef.current.style[propName.overflowY] = '';
            }

            scrollCompensationEndIndex.current = -1;
        }, [startIndex]);

        useEffect(() => {
            let frameId: any;
            const frame = (): void => {
                frameId = requestAnimationFrame(frame);
                step.current();
            };

            frame();

            return () => {
                cancelAnimationFrame(frameId);
            };
        }, []);

        return (
            <Fragment key="ViewPortList">
                <div key="ViewPortListTop" ref={topRef} style={topStyle} />
                {slicedItems}
                <div key="ViewPortListBottom" ref={bottomRef} style={bottomStyle} />
            </Fragment>
        );
    }
);

export default ViewportList;
