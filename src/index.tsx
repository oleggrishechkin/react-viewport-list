import {
    useState,
    useRef,
    useEffect,
    Fragment,
    useImperativeHandle,
    useMemo,
    MutableRefObject,
    ReactNode,
    forwardRef,
    FC
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
    viewportRef?: MutableRefObject<HTMLElement> | null;
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

interface Frame {
    (): void;
}

interface Variables {
    cache: Array<number>;
    step: Frame;
    scrollToIndex: ScrollToIndexConfig | null;
}

const ViewportList: FC<ViewportListProps> = forwardRef<ViewportListRef, ViewportListProps>(
    (
        {
            viewportRef = null,
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
        const topRef = useRef<HTMLDivElement | null>(null);
        const bottomRef = useRef<HTMLDivElement | null>(null);
        const variables = useRef<Variables>({
            cache: [],
            step: () => null,
            scrollToIndex: startIndex ? { index: startIndex, alignToTop: initialAlignToTop } : null
        });
        const normalizedStartIndex = normalizeValue(MIN_INDEX, startIndex, maxIndex);
        const normalizedEndIndex = normalizeValue(normalizedStartIndex, endIndex, maxIndex);
        const topStyle = useMemo<Style>(
            () =>
                getStyle(
                    variables.current.cache
                        .slice(MIN_INDEX, normalizedStartIndex)
                        .reduce((sum, next) => sum + next, normalizedStartIndex * itemMinSizeWithMargin)
                ),
            [normalizedStartIndex, itemMinSizeWithMargin, getStyle]
        );
        const bottomStyle = useMemo<Style>(
            () =>
                getStyle(
                    variables.current.cache
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
        const scroll: Frame = () => {
            if (!viewportRef?.current) {
                return;
            }

            const oldScroll = viewportRef.current[propName.scrollTop];
            const oldScrollSize =
                viewportRef.current[propName.scrollHeight] - viewportRef.current[propName.clientHeight];

            setTimeout(() => {
                const newScrollSize =
                    viewportRef.current[propName.scrollHeight] - viewportRef.current[propName.clientHeight];
                const newScroll = oldScroll + newScrollSize - oldScrollSize;

                if (viewportRef.current[propName.scrollTop] !== newScroll) {
                    viewportRef.current[propName.scrollTop] = oldScroll + newScrollSize - oldScrollSize;
                }
            });
        };

        variables.current.step = () => {
            const viewportRect = viewportRef?.current?.getBoundingClientRect();
            const topLimit =
                (viewportRect
                    ? normalizeValue(0, viewportRect[propName.top], document.documentElement[propName.clientHeight])
                    : 0) - overscanSize;
            const bottomLimit =
                (viewportRect
                    ? normalizeValue(0, viewportRect[propName.bottom], document.documentElement[propName.clientHeight])
                    : document.documentElement[propName.clientHeight]) + overscanSize;
            const topElementRect = (topRef.current?.nextSibling as Element)?.getBoundingClientRect();
            const bottomElementRect = (bottomRef.current?.previousSibling as Element)?.getBoundingClientRect();
            const maxItemsCountInViewPort = Math.ceil((bottomLimit - topLimit) / itemMinSizeWithMargin);
            let nextStartIndex = startIndex;
            let nextEndIndex = endIndex;
            let diff;
            let index;
            let element;

            if (!topElementRect || !bottomElementRect) {
                return;
            }

            if (variables.current.scrollToIndex) {
                const targetIndex = normalizeValue(MIN_INDEX, variables.current.scrollToIndex.index, maxIndex);

                if (targetIndex >= startIndex && targetIndex <= endIndex) {
                    index = startIndex;
                    element = topRef.current?.nextSibling as Element;

                    while (!!element && element !== bottomRef.current) {
                        if (index === targetIndex) {
                            element.scrollIntoView(variables.current.scrollToIndex.alignToTop);
                            variables.current.scrollToIndex = null;

                            break;
                        }

                        element = element.nextSibling as Element;
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
                    diff -= (variables.current.cache[--nextEndIndex] || 0) + itemMinSizeWithMargin;
                }

                scroll();
                nextStartIndex = nextEndIndex - maxItemsCountInViewPort;
            } else if (bottomElementRect[propName.bottom] + margin <= topLimit) {
                diff = topLimit - bottomElementRect[propName.bottom] + margin;
                nextStartIndex = endIndex;

                while (diff >= 0 && nextStartIndex < maxIndex) {
                    diff -= (variables.current.cache[++nextStartIndex] || 0) + itemMinSizeWithMargin;
                }

                nextEndIndex = nextStartIndex + maxItemsCountInViewPort;
            } else {
                if (topElementRect[propName.bottom] + margin < topLimit) {
                    ++nextStartIndex;
                } else if (topElementRect[propName.top] >= topLimit) {
                    diff = topElementRect[propName.top] - topLimit;

                    while (diff >= 0 && nextStartIndex > MIN_INDEX) {
                        diff -= (variables.current.cache[--nextStartIndex] || 0) + itemMinSizeWithMargin;
                    }

                    scroll();
                }

                if (bottomElementRect[propName.bottom] + margin <= bottomLimit) {
                    diff = bottomLimit - bottomElementRect[propName.bottom] - margin;

                    while (diff >= 0 && nextEndIndex < maxIndex) {
                        diff -= (variables.current.cache[++nextEndIndex] || 0) + itemMinSizeWithMargin;
                    }
                } else if (bottomElementRect[propName.top] > bottomLimit) {
                    --nextEndIndex;
                }
            }

            nextStartIndex = normalizeValue(MIN_INDEX, nextStartIndex, maxIndex);
            nextEndIndex = normalizeValue(nextStartIndex, nextEndIndex, maxIndex);

            if (nextStartIndex !== startIndex || nextEndIndex !== endIndex) {
                index = startIndex;
                element = topRef.current?.nextSibling as Element;

                while (!!element && index <= endIndex && element !== bottomRef.current) {
                    variables.current.cache[index++] = element[propName.clientHeight] - itemMinSize;
                    element = element.nextSibling as Element;
                }

                setIndexes([nextStartIndex, nextEndIndex]);
            }
        };

        useImperativeHandle(
            ref,
            () => ({
                scrollToIndex: (index = -1, alignToTop = true) => {
                    variables.current.scrollToIndex = { index, alignToTop };
                }
            }),
            []
        );
        useEffect(() => {
            let frameId: number;
            const frame: Frame = () => {
                frameId = requestAnimationFrame(frame);
                variables.current.step();
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
