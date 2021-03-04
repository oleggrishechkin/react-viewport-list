import {
    useState,
    useRef,
    useEffect,
    Fragment,
    useImperativeHandle,
    useMemo,
    MutableRefObject,
    ReactNode,
    forwardRef
} from 'react';

const MIN_INDEX = 0;

interface NormalizeValue {
    (min: number, value: number, max: number): number;
}

const normalizeValue: NormalizeValue = (min, value, max) => Math.max(Math.min(value, max), min);

export type Axis = 'x' | 'y';

interface PropName {
    minHeight: 'minHeight' | 'minWidth';
    height: 'height' | 'width';
    maxHeight: 'maxHeight' | 'maxWidth';
    top: 'top' | 'left';
    bottom: 'bottom' | 'right';
    scrollHeight: 'scrollHeight' | 'scrollWidth';
    clientHeight: 'clientHeight' | 'clientWidth';
    scrollTop: 'scrollTop' | 'scrollLeft';
    overflowY: 'overflowY' | 'overflowX';
}

interface GetPropName {
    (axis: Axis): PropName;
}

const getPropName: GetPropName = (axis) => ({
    minHeight: axis === 'y' ? 'minHeight' : 'minWidth',
    height: axis === 'y' ? 'height' : 'width',
    maxHeight: axis === 'y' ? 'maxHeight' : 'maxWidth',
    top: axis === 'y' ? 'top' : 'left',
    bottom: axis === 'y' ? 'bottom' : 'right',
    scrollHeight: axis === 'y' ? 'scrollHeight' : 'scrollWidth',
    clientHeight: axis === 'y' ? 'clientHeight' : 'clientWidth',
    scrollTop: axis === 'y' ? 'scrollTop' : 'scrollLeft',
    overflowY: axis === 'y' ? 'overflowY' : 'overflowX'
});

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

interface GetStyle {
    (size: number): Style;
}

interface GetStyleFabric {
    (propName: PropName): GetStyle;
}

const getStyleFabric: GetStyleFabric = (propName) => (size) => ({
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

export interface ScrollToIndex {
    (index?: number, alignTop?: boolean): void;
}

export interface ViewportListRef {
    scrollToIndex: ScrollToIndex;
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

interface ScrollToIndexConfig {
    index: number;
    alignToTop: boolean | ScrollIntoViewOptions;
}

interface Void {
    (): void;
}

interface GetScrollBottom {
    (node: Element, propName: PropName): number;
}

const getScrollBottom: GetScrollBottom = (node, propName) =>
    node[propName.scrollHeight] - node[propName.clientHeight] - node[propName.scrollTop];

interface SetScrollBottom {
    (node: Element, value: number, propName: PropName): void;
}

const setScrollBottom: SetScrollBottom = (node, value, propName) => {
    node[propName.scrollTop] = node[propName.scrollHeight] - node[propName.clientHeight] - value;
};

interface SetScrollIfNeeded {
    (node: Element | null, propName: PropName): void;
}

const setScrollIfNeeded: SetScrollIfNeeded = (node, propName) => {
    if (node) {
        const scrollBottom = getScrollBottom(node, propName);

        setTimeout(() => {
            if (node && getScrollBottom(node, propName) !== scrollBottom) {
                setScrollBottom(node, scrollBottom, propName);
            }
        });
    }
};

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
        const propName = useMemo<PropName>(() => getPropName(axis), [axis]);
        const getStyle = useMemo<GetStyle>(() => getStyleFabric(propName), [propName]);
        const maxIndex = items.length - 1;
        const itemMinSizeWithMargin = itemMinSize + margin;
        const overscanSize = overscan * itemMinSizeWithMargin;
        const [[startIndex, endIndex], setIndexes] = useState<[number, number]>(() => {
            const normalizedInitialIndex = normalizeValue(MIN_INDEX, initialIndex, maxIndex);

            return [normalizedInitialIndex, normalizedInitialIndex];
        });
        const topRef = useRef<HTMLDivElement>(null);
        const bottomRef = useRef<HTMLDivElement>(null);
        const cache = useRef<Array<number>>([]);
        const scrollToIndex = useRef<ScrollToIndexConfig | null>(
            startIndex ? { index: startIndex, alignToTop: initialAlignToTop } : null
        );
        const step = useRef<Void>(() => {});
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
            const topLimit = viewportRect[propName.top] - overscanSize;
            const bottomLimit = viewportRect[propName.bottom] + overscanSize;
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

                nextStartIndex = nextEndIndex - maxItemsCountInViewPort;
                setScrollIfNeeded(viewportRef.current, propName);
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

                    setScrollIfNeeded(viewportRef.current, propName);
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
        useEffect(() => {
            let frameId: number;
            const frame: Void = () => {
                step.current();
                frameId = requestAnimationFrame(frame);
            };

            frame();

            return () => {
                cancelAnimationFrame(frameId);
            };
        }, []);

        return (
            <Fragment>
                <div ref={topRef} style={topStyle} />
                {slicedItems}
                <div ref={bottomRef} style={bottomStyle} />
            </Fragment>
        );
    }
);

export default ViewportList;
