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
    createElement,
    CSSProperties,
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

const useAnimationFrame = (func: () => void) => {
    const ref = useRef(func);

    useIsomorphicLayoutEffect(() => {
        ref.current = func;
    }, [func]);
    useIsomorphicLayoutEffect(() => {
        let frameId: number;
        const frame = () => {
            frameId = requestAnimationFrame(frame);
            ref.current();
        };

        frame();

        return () => cancelAnimationFrame(frameId);
    }, []);
};

export interface ViewportListRef {
    scrollToIndex: (index?: number, alignToTop?: boolean | ScrollIntoViewOptions, offset?: number) => void;
}

export interface ViewportListProps<T> {
    viewportRef?:
        | MutableRefObject<HTMLElement | null>
        | RefObject<HTMLElement | null>
        | { current: HTMLElement | null };
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
    scrollThreshold?: number;
    spacerElement?: keyof JSX.IntrinsicElements;
    spacerStyle?: CSSProperties;
}

const getDiff = (value1: number, value2: number, step: number) => Math.ceil(Math.abs(value1 - value2) / step);

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
        scrollThreshold = 0,
        spacerElement = 'div',
        spacerStyle = {},
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
    const topSpacerRef = useRef<any>(null);
    const bottomSpacerRef = useRef<any>(null);
    const cacheRef = useRef<number[]>([]);
    const scrollToIndexRef = useRef<{
        index: number;
        alignToTop: boolean | ScrollIntoViewOptions;
        offset: number;
    } | null>(initialIndex >= 0 ? { index: initialIndex, alignToTop: initialAlignToTop, offset: initialOffset } : null);
    const marginTopRef = useRef(0);
    const viewportIndexesRef = useRef<[number, number]>([-1, -1]);
    const anchorElementRef = useRef<Element | null>(null);
    const anchorIndexRef = useRef<number>(-1);
    const topSpacerStyle = useMemo(
        () => ({
            ...spacerStyle,
            ...getStyle(
                propName,
                // Array.prototype.reduce() runs only for initialized items.
                cacheRef.current
                    .slice(0, startIndex)
                    .reduce((sum, next) => sum + (next - itemHeight), startIndex * itemHeightWithMargin),
                marginTopRef.current,
            ),
        }),
        [propName, startIndex, itemHeightWithMargin, itemHeight, spacerStyle],
    );
    const bottomSpacerStyle = useMemo(
        () => ({
            ...spacerStyle,
            ...getStyle(
                propName,
                // Array.prototype.reduce() runs only for initialized items.
                cacheRef.current
                    .slice(endIndex + 1, maxIndex + 1)
                    .reduce((sum, next) => sum + (next - itemHeight), itemHeightWithMargin * (maxIndex - endIndex)),
            ),
        }),
        [propName, endIndex, maxIndex, itemHeightWithMargin, itemHeight, spacerStyle],
    );
    const scrollTopRef = useRef<number | null>(null);

    useAnimationFrame(() => {
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
        const limits = {
            [propName.top]: viewport === document.documentElement ? 0 : viewportRect[propName.top],
            [propName.bottom]:
                viewport === document.documentElement
                    ? document.documentElement.clientHeight
                    : viewportRect[propName.bottom],
        };
        const limitsWithOverscanSize = {
            [propName.top]: limits[propName.top] - overscanSize,
            [propName.bottom]: limits[propName.bottom] + overscanSize,
        };

        if (
            (marginTopRef.current < 0 &&
                topSpacerRect[propName.top] - marginTopRef.current >= limitsWithOverscanSize[propName.top]) ||
            (marginTopRef.current > 0 && topSpacerRect[propName.top] >= limitsWithOverscanSize[propName.top]) ||
            (marginTopRef.current && scrollToIndexRef.current)
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

        const averageSize = Math.ceil(
            (bottomSpacerRect[propName.top] - topSpacerRect[propName.bottom]) / (endIndex + 1 - startIndex),
        );

        if (scrollToIndexRef.current) {
            const targetIndex = normalizeValue(0, scrollToIndexRef.current.index, maxIndex);

            if (targetIndex < startIndex || targetIndex > endIndex) {
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

        if (scrollTopRef.current === null) {
            scrollTopRef.current = viewport.scrollTop;
        } else if (scrollTopRef.current !== viewport.scrollTop) {
            const diff = Math.abs(viewport.scrollTop - scrollTopRef.current);

            scrollTopRef.current = viewport.scrollTop;

            if (scrollThreshold > 0 && diff > scrollThreshold) {
                return;
            }
        }

        const isAllAboveTop = topSpacerRect[propName.bottom] > limitsWithOverscanSize[propName.bottom];
        const isAllBelowBottom = bottomSpacerRect[propName.top] < limitsWithOverscanSize[propName.top];
        const isTopBelowTop =
            !isAllAboveTop &&
            !isAllBelowBottom &&
            topSpacerRect[propName.bottom] > limitsWithOverscanSize[propName.top];
        const isBottomAboveBottom =
            !isAllAboveTop &&
            !isAllBelowBottom &&
            bottomSpacerRect[propName.top] < limitsWithOverscanSize[propName.bottom];
        const isBottomSecondAboveTop =
            !isAllAboveTop &&
            !isAllBelowBottom &&
            bottomSecondElement.getBoundingClientRect()[propName.bottom] > limitsWithOverscanSize[propName.bottom];
        const isTopSecondAboveTop =
            !isAllAboveTop &&
            !isAllBelowBottom &&
            topSecondElement.getBoundingClientRect()[propName.top] < limitsWithOverscanSize[propName.top];
        let nextStartIndex = startIndex;
        let nextEndIndex = endIndex;

        if (isAllAboveTop) {
            nextStartIndex -= getDiff(
                topSpacerRect[propName.bottom],
                limitsWithOverscanSize[propName.top],
                averageSize,
            );
            nextEndIndex -= getDiff(
                bottomSpacerRect[propName.top],
                limitsWithOverscanSize[propName.bottom],
                averageSize,
            );
        }

        if (isAllBelowBottom) {
            nextEndIndex += getDiff(
                bottomSpacerRect[propName.top],
                limitsWithOverscanSize[propName.bottom],
                averageSize,
            );
            nextStartIndex += getDiff(
                topSpacerRect[propName.bottom],
                limitsWithOverscanSize[propName.top],
                averageSize,
            );
        }

        if (isTopBelowTop) {
            nextStartIndex -= getDiff(
                topSpacerRect[propName.bottom],
                limitsWithOverscanSize[propName.top],
                averageSize,
            );
        }

        if (isBottomAboveBottom) {
            nextEndIndex += getDiff(
                bottomSpacerRect[propName.top],
                limitsWithOverscanSize[propName.bottom],
                averageSize,
            );
        }

        if (isBottomSecondAboveTop) {
            let index = endIndex;
            let element: Element | null = bottomElement;

            while (element && element !== topSpacer) {
                if (element.getBoundingClientRect()[propName.bottom] <= limitsWithOverscanSize[propName.bottom]) {
                    nextEndIndex = index + 1;

                    break;
                }

                index--;
                element = element.previousSibling as Element | null;
            }
        }

        if (isTopSecondAboveTop) {
            let index = startIndex;
            let element: Element | null = topElement;

            while (element && element !== bottomSpacer) {
                if (element.getBoundingClientRect()[propName.top] >= limitsWithOverscanSize[propName.top]) {
                    nextStartIndex = index - 1;

                    break;
                }

                index++;
                element = element.nextSibling as Element | null;
            }
        }

        if (onViewportIndexesChange) {
            let index = startIndex;
            let element: Element | null = topElement;
            let startViewportIndex = startIndex;

            while (element && element !== bottomSpacer) {
                if (element.getBoundingClientRect()[propName.bottom] > limits[propName.top]) {
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
                if (element.getBoundingClientRect()[propName.top] < limits[propName.bottom]) {
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
            let anchorElement: Element | null = null;
            let anchorElementIndex = -1;

            if (startIndex >= nextStartIndex && startIndex <= nextEndIndex) {
                anchorElement = topElement;
                anchorElementIndex = startIndex;
            } else if (nextStartIndex >= startIndex && nextStartIndex <= endIndex) {
                let index = startIndex;
                let element: Element | null = topElement;

                while (element && element !== bottomSpacer) {
                    if (index === nextStartIndex) {
                        anchorElement = element;
                        anchorElementIndex = index;

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
            anchorIndexRef.current = anchorElementIndex;
        }

        setIndexes([nextStartIndex, nextEndIndex]);
    });

    let anchorScrollTopOnRender: number | undefined;
    let anchorHeightOnRender: number | undefined;

    if (anchorElementRef.current && viewportRef.current && topSpacerRef.current) {
        anchorScrollTopOnRender = viewportRef.current[propName.scrollTop];
        anchorHeightOnRender =
            anchorElementRef.current.getBoundingClientRect()[propName.top] -
            topSpacerRef.current.getBoundingClientRect()[propName.top];
    }

    useIsomorphicLayoutEffect(() => {
        anchorElementRef.current = null;

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
            !bottomSpacer ||
            anchorScrollTopOnRender === undefined ||
            anchorHeightOnRender === undefined ||
            anchorScrollTopOnRender !== viewportRef.current[propName.scrollTop]
        ) {
            return;
        }

        let anchorElement: Element | null = null;
        let index = startIndex;
        let element: Element | null = topSpacer.nextSibling as Element;

        while (element && element !== bottomSpacer) {
            if (index === anchorIndex) {
                anchorElement = element;

                break;
            }

            index++;
            element = element.nextSibling as Element | null;
        }

        if (!anchorElement) {
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
            topSpacerRef.current.style[propName.marginTop] = `${marginTopRef.current}px`;

            return;
        }

        viewportRef.current[propName.scrollTop] += offset;
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
            {createElement(spacerElement, { ref: topSpacerRef, style: topSpacerStyle })}
            {items.slice(startIndex, endIndex + 1).map((item, index) => children(item, startIndex + index, items))}
            {createElement(spacerElement, { ref: bottomSpacerRef, style: bottomSpacerStyle })}
        </Fragment>
    );
};

export const ViewportList = forwardRef(ViewportListInner) as <T>(
    props: ViewportListProps<T> & { ref?: ForwardedRef<ViewportListRef> },
) => ReturnType<typeof ViewportListInner>;

// eslint-disable-next-line import/no-default-export
export default ViewportList;
