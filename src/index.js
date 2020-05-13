import React, { useState, useRef, useEffect, Fragment, useImperativeHandle, useLayoutEffect, useMemo } from 'react';

const normalizeValue = (min, value, max) => Math.max(Math.min(value, max), min);

const getStyle = (height) => ({
    minHeight: height,
    height: height,
    maxHeight: height,
    overflowAnchor: 'none',
    pointerEvents: 'none',
    userSelect: 'none',
    padding: 0,
    margin: 0,
    border: 'none'
});

const MIN_INDEX = 0;

const IS_OVERFLOW_ANCHOR_SUPPORTED = (() => {
    try {
        return window.CSS.supports('overflow-anchor: auto');
    } catch (error) {
        return false;
    }
})();

const ViewPortList = React.forwardRef(
    (
        {
            viewPortRef = null,
            items = [],
            itemMinHeight,
            marginBottom = 0,
            overscan = 1,
            initialIndex = 0,
            initialAlignToTop = true,
            children
        },
        ref
    ) => {
        const maxIndex = items.length - 1;
        const itemMinHeightWithMargin = itemMinHeight + marginBottom;
        const overscanHeight = overscan * itemMinHeightWithMargin;
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
                        .reduce((sum, next) => sum + next, normalizedStartIndex * itemMinHeightWithMargin)
                ),
            [normalizedStartIndex, itemMinHeightWithMargin]
        );
        const bottomStyle = useMemo(
            () =>
                getStyle(
                    variables.current.cache
                        .slice(normalizedEndIndex + 1, maxIndex)
                        .reduce((sum, next) => sum + next, itemMinHeightWithMargin * (maxIndex - normalizedEndIndex))
                ),
            [normalizedEndIndex, maxIndex, itemMinHeightWithMargin]
        );
        const slicedItems = useMemo(
            () =>
                items
                    .slice(normalizedStartIndex, normalizedEndIndex + 1)
                    .map((item, index) => children(item, normalizedStartIndex + index)),
            [items, normalizedStartIndex, normalizedEndIndex, children]
        );

        variables.current.step = () => {
            const viewPortRect = viewPortRef && viewPortRef.current && viewPortRef.current.getBoundingClientRect();
            const topLimit =
                (viewPortRect ? normalizeValue(0, viewPortRect.top, document.documentElement.clientHeight) : 0) -
                overscanHeight;
            const bottomLimit =
                (viewPortRect
                    ? normalizeValue(0, viewPortRect.bottom, document.documentElement.clientHeight)
                    : document.documentElement.clientHeight) + overscanHeight;
            const firstElementRect = topRef.current.nextSibling.getBoundingClientRect();
            const lastElementRect = bottomRef.current.previousSibling.getBoundingClientRect();
            const maxItemsCountInViewPort = Math.ceil((bottomLimit - topLimit) / itemMinHeightWithMargin);
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
            } else if (firstElementRect.top >= bottomLimit) {
                diff = firstElementRect.top - bottomLimit;
                nextEndIndex = startIndex;

                while (diff >= 0 && nextEndIndex > MIN_INDEX) {
                    diff -= (variables.current.cache[--nextEndIndex] || 0) + itemMinHeightWithMargin;
                }

                variables.current.scrollCompensationEndIndex = startIndex;
                nextStartIndex = nextEndIndex - maxItemsCountInViewPort;
            } else if (lastElementRect.bottom + marginBottom <= topLimit) {
                diff = topLimit - lastElementRect.bottom + marginBottom;
                nextStartIndex = endIndex;

                while (diff >= 0 && nextStartIndex < maxIndex) {
                    diff -= (variables.current.cache[++nextStartIndex] || 0) + itemMinHeightWithMargin;
                }

                nextEndIndex = nextStartIndex + maxItemsCountInViewPort;
            } else {
                if (firstElementRect.bottom + marginBottom < topLimit) {
                    ++nextStartIndex;
                } else if (firstElementRect.top >= topLimit) {
                    diff = firstElementRect.top - topLimit;

                    while (diff >= 0 && nextStartIndex > MIN_INDEX) {
                        diff -= (variables.current.cache[--nextStartIndex] || 0) + itemMinHeightWithMargin;
                    }

                    variables.current.scrollCompensationEndIndex = startIndex;
                }

                if (lastElementRect.bottom + marginBottom <= bottomLimit) {
                    diff = bottomLimit - lastElementRect.bottom - marginBottom;

                    while (diff >= 0 && nextEndIndex < maxIndex) {
                        diff -= (variables.current.cache[++nextEndIndex] || 0) + itemMinHeightWithMargin;
                    }
                } else if (lastElementRect.top > bottomLimit) {
                    --nextEndIndex;
                }
            }

            nextStartIndex = normalizeValue(MIN_INDEX, nextStartIndex, maxIndex);
            nextEndIndex = normalizeValue(nextStartIndex, nextEndIndex, maxIndex);

            if (nextStartIndex !== startIndex || nextEndIndex !== endIndex) {
                index = startIndex;
                element = topRef.current.nextSibling;

                while (index <= endIndex && element !== bottomRef.current) {
                    variables.current.cache[index++] = element.clientHeight - itemMinHeight;
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

            if (!viewPortRef || IS_OVERFLOW_ANCHOR_SUPPORTED) {
                variables.current.scrollCompensationEndIndex = null;

                return;
            }

            let index = startIndex;
            let element = topRef.current.nextSibling;
            let heightDiff = 0;

            while (index < variables.current.scrollCompensationEndIndex && element !== bottomRef.current) {
                heightDiff += element.clientHeight - (variables.current.cache[index] || 0) - itemMinHeight;
                element = element.nextSibling;
                ++index;
            }

            if (viewPortRef && heightDiff) {
                viewPortRef.current.style.overflowY = 'hidden';
                viewPortRef.current.scrollTop += heightDiff;
                viewPortRef.current.style.overflowY = null;
            }

            variables.current.scrollCompensationEndIndex = null;
        }, [viewPortRef, startIndex, itemMinHeight]);

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

export default ViewPortList;
