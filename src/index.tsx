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

const SHOULD_DELAY_SCROLL = IS_TOUCH_DEVICE && !IS_OVERFLOW_ANCHOR_SUPPORTED; // mobile Safari

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

const findElement = ({
    fromElement,
    toElement,
    fromIndex,
    asc = true,
    compare,
}: {
    fromElement: Element;
    toElement: Element;
    fromIndex: number;
    asc?: boolean;
    compare: (element: Element, index: number) => boolean;
}) => {
    let index = fromIndex;
    let element: Element | null = fromElement;

    while (element && element !== toElement) {
        if (compare(element, index)) {
            return [element, index] as const;
        }

        if (asc) {
            index++;
            element = element.nextSibling as Element | null;
        } else {
            index--;
            element = element.previousSibling as Element | null;
        }
    }

    return [null, -1] as const;
};

const generateArray = <T,>(from: number, to: number, generate: (index: number) => T): T[] => {
    const array = [];

    for (let index = from; index < to; index++) {
        array.push(generate(index));
    }

    return array;
};

export interface ViewportListRef {
    scrollToIndex: (index?: number, alignToTop?: boolean, offset?: number) => void;
}

export interface ViewportListPropsBase {
    viewportRef?:
        | MutableRefObject<HTMLElement | null>
        | RefObject<HTMLElement | null>
        | { current: HTMLElement | null };
    // itemMinSize should be 0 or greater. It's estimated item size. Name saved for backward compatibility.
    itemMinSize?: number;
    // Margin should be -1 or greater
    margin?: number;
    overscan?: number;
    axis?: 'y' | 'x';
    initialIndex?: number;
    initialAlignToTop?: boolean;
    initialOffset?: number;
    onViewportIndexesChange?: (viewportIndexes: [number, number]) => void;
    overflowAnchor?: 'none' | 'auto';
    withCache?: boolean;
    scrollThreshold?: number;
    scrollToIndexDelay?: number;
    renderSpacer?: (props: { ref: MutableRefObject<any>; style: CSSProperties; type: 'top' | 'bottom' }) => any;
}

export interface ViewportListPropsWithItems<T> extends ViewportListPropsBase {
    items?: T[];
    children: (item: T, index: number, array: T[]) => any;
}

export interface ViewportListPropsWithCount extends ViewportListPropsBase {
    count: number;
    children: (index: number) => any;
}

const getDiff = (value1: number, value2: number, step: number) => Math.ceil(Math.abs(value1 - value2) / step);

const ViewportListInner = <T,>(
    {
        viewportRef = { current: IS_SSR ? null : document.documentElement },
        items = [],
        count,
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
        scrollToIndexDelay = 30,
        renderSpacer = ({ ref, style }) => <div ref={ref} style={style} />,
    }: ViewportListPropsBase & { items?: T[]; count?: number; children: (...args: any) => any },
    ref: ForwardedRef<ViewportListRef>,
) => {
    const propName = axis === 'y' ? PROP_NAME_FOR_Y_AXIS : PROP_NAME_FOR_X_AXIS;
    const withCount = typeof count === 'number';
    const itemsCount = withCount ? count : items.length;
    const maxIndex = itemsCount - 1;
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
    const scrollToIndexTimeoutId = useRef<any>(null);
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

        if (scrollToIndexTimeoutId.current) {
            return;
        }

        if (scrollToIndexRef.current) {
            const targetIndex = normalizeValue(0, scrollToIndexRef.current.index, maxIndex);

            if (targetIndex < startIndex || targetIndex > endIndex) {
                setIndexes([targetIndex, targetIndex]);

                return;
            }

            const [targetElement] = findElement({
                fromElement: topSpacer.nextSibling as Element,
                toElement: bottomSpacer,
                fromIndex: startIndex,
                compare: (_, index) => index === targetIndex,
            });

            if (targetElement) {
                const alignToTop = scrollToIndexRef.current.alignToTop;
                const offset = scrollToIndexRef.current.offset;

                scrollToIndexRef.current = null;

                const scrollToElement = () => {
                    const elementRect = targetElement.getBoundingClientRect();

                    if (alignToTop) {
                        viewport[propName.scrollTop] += elementRect[propName.top] - limits[propName.top] + offset;
                    } else {
                        viewport[propName.scrollTop] +=
                            elementRect[propName.bottom] -
                            limits[propName.top] -
                            viewport[propName.clientHeight] +
                            offset;
                    }

                    scrollToIndexTimeoutId.current = null;
                };

                if (SHOULD_DELAY_SCROLL) {
                    scrollToIndexTimeoutId.current = setTimeout(scrollToElement, scrollToIndexDelay);
                } else {
                    scrollToElement();
                }
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
            const [, index] = findElement({
                fromElement: bottomElement,
                toElement: topSpacer,
                fromIndex: endIndex,
                asc: false,
                compare: (element) =>
                    element.getBoundingClientRect()[propName.bottom] <= limitsWithOverscanSize[propName.bottom],
            });

            if (index !== -1) {
                nextEndIndex = index + 1;
            }
        }

        if (isTopSecondAboveTop) {
            const [, index] = findElement({
                fromElement: topElement,
                toElement: bottomSpacer,
                fromIndex: startIndex,
                compare: (element) =>
                    element.getBoundingClientRect()[propName.top] >= limitsWithOverscanSize[propName.top],
            });

            if (index !== -1) {
                nextStartIndex = index - 1;
            }
        }

        if (onViewportIndexesChange) {
            let [, startViewportIndex] = findElement({
                fromElement: topElement,
                toElement: bottomSpacer,
                fromIndex: startIndex,
                compare: (element) => element.getBoundingClientRect()[propName.bottom] > limits[propName.top],
            });

            if (startViewportIndex === -1) {
                startViewportIndex = startIndex;
            }

            let [, endViewportIndex] = findElement({
                fromElement: bottomElement,
                toElement: topSpacer,
                fromIndex: endIndex,
                asc: false,
                compare: (element) => element.getBoundingClientRect()[propName.top] < limits[propName.bottom],
            });

            if (endViewportIndex === -1) {
                endViewportIndex = endIndex;
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
                [anchorElement, anchorElementIndex] = findElement({
                    fromElement: topElement,
                    toElement: bottomSpacer,
                    fromIndex: startIndex,
                    compare: (element, index) => {
                        if (index === nextStartIndex) {
                            return true;
                        }

                        if (withCache && element[propName.clientHeight] !== itemHeight) {
                            cacheRef.current[index] = element[propName.clientHeight];
                        }

                        return false;
                    },
                });
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

        const [anchorElement] = findElement({
            fromElement: topSpacer.nextSibling as Element,
            toElement: bottomSpacer,
            fromIndex: startIndex,
            compare: (_, index) => index === anchorIndex,
        });

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

    useEffect(
        () => () => {
            if (scrollToIndexTimeoutId.current) {
                clearTimeout(scrollToIndexTimeoutId.current);
            }
        },
        [],
    );
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
            {renderSpacer({ ref: topSpacerRef, style: topSpacerStyle, type: 'top' })}
            {generateArray(
                startIndex,
                endIndex + 1,
                withCount ? children : (index) => children(items[index], index, items),
            )}
            {renderSpacer({ ref: bottomSpacerRef, style: bottomSpacerStyle, type: 'bottom' })}
        </Fragment>
    );
};

export interface ViewportList {
    <T>(props: ViewportListPropsWithItems<T> & { ref?: ForwardedRef<ViewportListRef> }): ReturnType<
        typeof ViewportListInner
    >;
    (props: ViewportListPropsWithCount & { ref?: ForwardedRef<ViewportListRef> }): ReturnType<typeof ViewportListInner>;
}

export const ViewportList = forwardRef(ViewportListInner) as ViewportList;

// eslint-disable-next-line import/no-default-export
export default ViewportList;
