import React, { useState, useRef, useEffect, Fragment, useImperativeHandle, useLayoutEffect, useMemo } from 'react';

const normalizeValue = (min, value, max) => Math.max(Math.min(value, max), min);

const getStyleFabric = (axis = 'y') => {
    const propName = {
        minHeight: axis === 'y' ? 'minHeight' : 'minWidth',
        height: axis === 'y' ? 'height' : 'width',
        maxHeight: axis === 'y' ? 'maxHeight' : 'maxWidth'
    };

    return (size) => ({
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
};

const MIN_INDEX = 0;

const IS_OVERFLOW_ANCHOR_SUPPORTED = (() => {
    try {
        return window.CSS.supports('overflow-anchor: auto');
    } catch (error) {
        return false;
    }
})();

const ViewportList = React.forwardRef(
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
        const { propName, getStyle } = useMemo(
            () => ({
                propName: {
                    top: axis === 'y' ? 'top' : 'left',
                    bottom: axis === 'y' ? 'bottom' : 'right',
                    clientHeight: axis === 'y' ? 'clientHeight' : 'clientWidth',
                    scrollTop: axis === 'y' ? 'scrollTop' : 'scrollLeft',
                    overflowY: axis === 'y' ? 'overflowY' : 'overflowX'
                },
                getStyle: getStyleFabric(axis)
            }),
            [axis]
        );
        const maxIndex = items.length - 1;
        const itemMinSizeWithMargin = itemMinSize + margin;
        const overscanSize = overscan * itemMinSizeWithMargin;
        const [[startIndex, endIndex], setIndexes] = useState(() => {
            const normalizedInitialIndex = normalizeValue(MIN_INDEX, initialIndex, maxIndex);

            return [normalizedInitialIndex, normalizedInitialIndex];
        });
        const topRef = useRef(null);
        const bottomRef = useRef(null);
        const variables = useRef({
            cache: [],
            step: () => {},
            scrollToIndex: startIndex ? { index: startIndex, alignToTop: initialAlignToTop } : null,
            scrollCompensationEndIndex: null
        });
        const normalizedStartIndex = normalizeValue(MIN_INDEX, startIndex, maxIndex);
        const normalizedEndIndex = normalizeValue(normalizedStartIndex, endIndex, maxIndex);
        const topStyle = useMemo(
            () =>
                getStyle(
                    variables.current.cache
                        .slice(MIN_INDEX, normalizedStartIndex)
                        .reduce((sum, next) => sum + next, normalizedStartIndex * itemMinSizeWithMargin)
                ),
            [normalizedStartIndex, itemMinSizeWithMargin, getStyle]
        );
        const bottomStyle = useMemo(
            () =>
                getStyle(
                    variables.current.cache
                        .slice(normalizedEndIndex + 1, maxIndex)
                        .reduce((sum, next) => sum + next, itemMinSizeWithMargin * (maxIndex - normalizedEndIndex))
                ),
            [normalizedEndIndex, maxIndex, itemMinSizeWithMargin, getStyle]
        );
        const slicedItems = useMemo(
            () =>
                items
                    .slice(normalizedStartIndex, normalizedEndIndex + 1)
                    .map((item, index) => children(item, normalizedStartIndex + index)),
            [items, normalizedStartIndex, normalizedEndIndex, children]
        );

        variables.current.step = () => {
            const viewportRect = viewportRef && viewportRef.current && viewportRef.current.getBoundingClientRect();
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

            if (variables.current.scrollToIndex) {
                const targetIndex = normalizeValue(MIN_INDEX, variables.current.scrollToIndex.index, maxIndex);

                if (targetIndex >= startIndex && targetIndex <= endIndex) {
                    index = startIndex;
                    element = topRef.current.nextSibling;

                    while (element !== bottomRef.current) {
                        if (index === targetIndex) {
                            element.scrollIntoView(variables.current.scrollToIndex.alignToTop);
                            variables.current.scrollToIndex = null;

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
                    diff -= (variables.current.cache[--nextEndIndex] || 0) + itemMinSizeWithMargin;
                }

                variables.current.scrollCompensationEndIndex = startIndex;
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

                    variables.current.scrollCompensationEndIndex = startIndex;
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
                element = topRef.current.nextSibling;

                while (index <= endIndex && element !== bottomRef.current) {
                    variables.current.cache[index++] = element[propName.clientHeight] - itemMinSize;
                    element = element.nextSibling;
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

        useLayoutEffect(() => {
            if (variables.current.scrollCompensationEndIndex === null) {
                return;
            }

            if (!viewportRef || IS_OVERFLOW_ANCHOR_SUPPORTED) {
                variables.current.scrollCompensationEndIndex = null;

                return;
            }

            let index = startIndex;
            let element = topRef.current.nextSibling;
            let sizeDiff = 0;

            while (index < variables.current.scrollCompensationEndIndex && element !== bottomRef.current) {
                sizeDiff += element[propName.clientHeight] - (variables.current.cache[index] || 0) - itemMinSize;
                element = element.nextSibling;
                ++index;
            }

            if (viewportRef && sizeDiff) {
                viewportRef.current.style[propName.overflowY] = 'hidden';
                viewportRef.current[propName.scrollTop] += sizeDiff;
                viewportRef.current.style[propName.overflowY] = null;
            }

            variables.current.scrollCompensationEndIndex = null;
        }, [viewportRef, startIndex, itemMinSize, propName]);

        useEffect(() => {
            let frameId = null;
            const frame = () => {
                frameId = requestAnimationFrame(frame);
                variables.current.step();
            };

            frame();

            return () => cancelAnimationFrame(frameId);
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
