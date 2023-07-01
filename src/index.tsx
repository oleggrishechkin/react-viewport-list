import {
    useState,
    useRef,
    Fragment,
    useImperativeHandle,
    MutableRefObject,
    forwardRef,
    ForwardedRef,
    RefObject,
    CSSProperties,
} from 'react';
import { PROP_NAME_FOR_Y_AXIS, PROP_NAME_FOR_X_AXIS } from './contants';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { useAutoViewport } from './useAutoViewport';
import { normalizeValue, getDiff, findElement } from './utils';
import { useRenderSpacers } from './useRenderSpacers';
import { useAutoItemHeightAndMargin } from './useAutoItemHeightAndMargin';
import { useGetScrollPosition } from './useGetScrollPosition';
import { useScrollToIndex } from './useScrollToIndex';
import { useOnViewportIndexesChange } from './useOnViewportIndexesChange';
import { useScrollThreshold } from './useScrollThreshold';
import { useMarginTop } from './useMarginTop';
import { useRenderItems } from './useRenderItems';
import { useScrollCompensation } from './useScrollCompensation';
import { useAnchor } from './useAnchor';
import { useShift } from './useShift';

export interface ScrollToIndexOptions {
    index?: number;
    alignToTop?: boolean;
    offset?: number;
    delay?: number;
    prerender?: number;
}

export interface ViewportListRef {
    scrollToIndex: (options: ScrollToIndexOptions) => void;
    getScrollPosition: () => { index: number; offset: number };
}

export interface ViewportListPropsBase {
    viewportRef?:
        | MutableRefObject<HTMLElement | null>
        | RefObject<HTMLElement | null>
        | { current: HTMLElement | null }
        | null;
    itemSize?: number;
    itemMargin?: number;
    overscan?: number;
    axis?: 'y' | 'x';
    initialIndex?: ScrollToIndexOptions['index'];
    initialAlignToTop?: ScrollToIndexOptions['alignToTop'];
    initialOffset?: ScrollToIndexOptions['offset'];
    initialDelay?: ScrollToIndexOptions['delay'];
    initialPrerender?: ScrollToIndexOptions['prerender'];
    onViewportIndexesChange?: (viewportIndexes: [number, number]) => void;
    overflowAnchor?: 'none' | 'auto';
    withCache?: boolean;
    scrollThreshold?: number;
    renderSpacer?: (props: { ref: MutableRefObject<any>; style: CSSProperties; type: 'top' | 'bottom' }) => any;
    indexesShift?: number;
    getItemBoundingClientRect?: (element: Element) =>
        | DOMRect
        | {
              bottom: number;
              left: number;
              right: number;
              top: number;
              width: number;
              height: number;
          };
}

export interface ViewportListPropsWithItems<T> extends ViewportListPropsBase {
    items?: T[];
    children: (item: T, index: number, array: T[]) => any;
}

export interface ViewportListPropsWithCount extends ViewportListPropsBase {
    count: number;
    children: (index: number) => any;
}

const ViewportListInner = <T,>(
    {
        items = [],
        count,
        children,
        viewportRef,
        itemSize = 0,
        itemMargin = -1,
        overscan = 1,
        axis = 'y',
        initialIndex = -1,
        initialAlignToTop = true,
        initialOffset = 0,
        initialDelay = -1,
        initialPrerender = 0,
        onViewportIndexesChange,
        overflowAnchor = 'auto',
        withCache = true,
        scrollThreshold = 0,
        renderSpacer = ({ ref, style }) => <div ref={ref} style={style} />,
        indexesShift = 0,
        getItemBoundingClientRect = (element) => element.getBoundingClientRect(),
    }: ViewportListPropsBase & { items?: T[]; count?: number; children: (...args: any) => any },
    ref: ForwardedRef<ViewportListRef>,
) => {
    const propName = axis === 'y' ? PROP_NAME_FOR_Y_AXIS : PROP_NAME_FOR_X_AXIS;
    const withCount = typeof count === 'number';
    const maxIndex = (withCount ? count : items.length) - 1;
    const [indexes, setIndexes] = useState<[number, number]>([
        initialIndex - initialPrerender,
        initialIndex + initialPrerender,
    ]);
    const topSpacerRef = useRef<any>(null);
    const bottomSpacerRef = useRef<any>(null);
    const cacheRef = useRef<number[]>([]);
    const [anchorRef, findAnchor] = useAnchor({
        propName,
        cacheRef,
        getItemBoundingClientRect,
    });
    const [startIndex, endIndex] = useShift({
        anchorRef,
        indexes,
        indexesShift,
        maxIndex,
        topSpacerRef,
    });
    const autoViewportRef = useAutoViewport({ viewportRef, axis, topSpacerRef });
    const [estimatedItemHeight, estimatedItemMargin, autoItemHeightAndMarginFrame] = useAutoItemHeightAndMargin({
        itemHeight: itemSize,
        itemMargin,
    });
    const [isScrollingToIndex, initScrollToIndex, scrollToIndexFrame] = useScrollToIndex({
        initialIndex,
        initialAlignToTop,
        initialOffset,
        initialDelay,
        initialPrerender,
    });
    const [onViewportIndexesChangeFrame] = useOnViewportIndexesChange({ onViewportIndexesChange });
    const [scrollThresholdFrame] = useScrollThreshold({ scrollThreshold });
    const [marginTopRef, addMarginTop, marginTopFrame] = useMarginTop({ propName, topSpacerRef });
    const [renderTopSpacer, renderBottomSpacer] = useRenderSpacers({
        propName,
        topSpacerRef,
        bottomSpacerRef,
        cacheRef,
        marginTopRef,
        withCache,
        itemHeight: estimatedItemHeight,
        itemMargin: estimatedItemMargin,
        maxIndex,
        startIndex,
        endIndex,
        renderSpacer,
    });
    const itemHeightWithMargin = normalizeValue(0, estimatedItemHeight + estimatedItemMargin);
    const overscanSize = normalizeValue(0, Math.ceil(overscan * itemHeightWithMargin));
    const mainFrameRef = useRef(() => {});
    const getScrollPosition = useGetScrollPosition({
        propName,
        viewportRef: autoViewportRef,
        topSpacerRef,
        bottomSpacerRef,
        startIndex,
        getItemBoundingClientRect,
    });
    const renderItems = useRenderItems({
        items,
        count,
        children,
        startIndex,
        endIndex,
        withCount,
    });

    useScrollCompensation({
        propName,
        maxIndex,
        cacheRef,
        viewportRef: autoViewportRef,
        topSpacerRef,
        bottomSpacerRef,
        getItemBoundingClientRect,
        startIndex,
        endIndex,
        overflowAnchor,
        withCache,
        itemHeight: estimatedItemHeight,
        itemMargin: estimatedItemMargin,
        addMarginTop,
        anchorRef,
    });

    useIsomorphicLayoutEffect(() => {
        mainFrameRef.current = () => {
            const viewport = autoViewportRef.current;
            const topSpacer = topSpacerRef.current;
            const bottomSpacer = bottomSpacerRef.current;

            if (!viewport || !topSpacer || !bottomSpacer) {
                return;
            }

            const topElement = topSpacer.nextSibling as Element;
            const bottomElement = bottomSpacer.previousSibling as Element;
            const viewportRect = viewport.getBoundingClientRect();
            const topSpacerRect = topSpacer.getBoundingClientRect();
            const bottomSpacerRect = bottomSpacer.getBoundingClientRect();
            const limits = {
                [propName.top]: viewport === document.documentElement ? 0 : viewportRect[propName.top],
                [propName.bottom]:
                    viewport === document.documentElement
                        ? document.documentElement[propName.clientHeight]
                        : viewportRect[propName.bottom],
            };
            const limitsWithOverscanSize = {
                [propName.top]: limits[propName.top] - overscanSize,
                [propName.bottom]: limits[propName.bottom] + overscanSize,
            };

            if (
                marginTopFrame({
                    propName,
                    viewport,
                    topSpacer,
                    topSpacerRect,
                    limitsWithOverscanSize,
                    isScrollingToIndex,
                })
            ) {
                return;
            }

            if (
                autoItemHeightAndMarginFrame({
                    propName,
                    topElement,
                    topSpacerRect,
                    bottomSpacerRect,
                    bottomSpacer,
                    startIndex,
                    endIndex,
                    getItemBoundingClientRect,
                })
            ) {
                return;
            }

            if (
                scrollToIndexFrame({
                    propName,
                    viewport,
                    topElement,
                    bottomSpacer,
                    startIndex,
                    endIndex,
                    getItemBoundingClientRect,
                    limits,
                    setIndexes,
                    maxIndex,
                })
            ) {
                return;
            }

            if (
                scrollThresholdFrame({
                    viewport,
                })
            ) {
                return;
            }

            if (
                onViewportIndexesChangeFrame({
                    propName,
                    viewport,
                    topElement,
                    bottomElement,
                    topSpacer,
                    bottomSpacer,
                    startIndex,
                    endIndex,
                    getItemBoundingClientRect,
                    limits,
                })
            ) {
                return;
            }

            const topSecondElement = topElement === bottomSpacer ? bottomSpacer : (topElement.nextSibling as Element);
            const bottomSecondElement =
                bottomElement === topSpacer ? topSpacer : (bottomElement.previousSibling as Element);
            const averageSize = Math.ceil(
                (bottomSpacerRect[propName.top] - topSpacerRect[propName.bottom]) / (endIndex + 1 - startIndex),
            );
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
                (bottomSecondElement === topSpacer ? topSpacerRect : getItemBoundingClientRect(bottomSecondElement))[
                    propName.bottom
                ] > limitsWithOverscanSize[propName.bottom];
            const isTopSecondAboveTop =
                !isAllAboveTop &&
                !isAllBelowBottom &&
                (topSecondElement === bottomSpacer ? bottomSpacerRect : getItemBoundingClientRect(topSecondElement))[
                    propName.top
                ] < limitsWithOverscanSize[propName.top];
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
                        getItemBoundingClientRect(element)[propName.bottom] <= limitsWithOverscanSize[propName.bottom],
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
                        getItemBoundingClientRect(element)[propName.top] >= limitsWithOverscanSize[propName.top],
                });

                if (index !== -1) {
                    nextStartIndex = index - 1;
                }
            }

            nextStartIndex = normalizeValue(0, nextStartIndex, maxIndex);
            nextEndIndex = normalizeValue(nextStartIndex, nextEndIndex, maxIndex);

            if (nextStartIndex === startIndex && nextEndIndex === endIndex) {
                return;
            }

            if (nextStartIndex !== startIndex) {
                anchorRef.current = findAnchor({
                    bottomSpacer,
                    topElement,
                    bottomElement,
                    nextStartIndex,
                    startIndex,
                    endIndex,
                    itemHeight: estimatedItemHeight,
                });
            }

            setIndexes([nextStartIndex, nextEndIndex]);
        };
    });

    useIsomorphicLayoutEffect(() => {
        let frameId: number;
        const frame = () => {
            frameId = requestAnimationFrame(frame);
            mainFrameRef.current();
        };

        frame();

        return () => {
            cancelAnimationFrame(frameId);
        };
    }, []);
    useImperativeHandle(
        ref,
        () => ({
            scrollToIndex: initScrollToIndex(() => mainFrameRef.current()),
            getScrollPosition,
        }),
        [getScrollPosition, initScrollToIndex],
    );

    return (
        <Fragment>
            {renderTopSpacer}
            {renderItems}
            {renderBottomSpacer}
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
