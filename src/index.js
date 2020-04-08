import React, { useState, useRef, useEffect, Fragment, useImperativeHandle, useLayoutEffect, useMemo } from 'react';

const normalizeValue = (min, value, max) => Math.max(Math.min(value, max), min);

const MIN_INDEX = 0;

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
        const normalizedInitialIndex = normalizeValue(MIN_INDEX, initialIndex, maxIndex);
        const [[startIndex, endIndex], setIndexes] = useState([normalizedInitialIndex, normalizedInitialIndex]);
        const topRef = useRef(null);
        const bottomRef = useRef(null);
        const cache = useRef([]);
        const step = useRef(() => {});
        const scrollToIndex = useRef(
            normalizedInitialIndex ? { index: normalizedInitialIndex, alignToTop: initialAlignToTop } : null
        );
        const isOverflowAnchorSupported = useRef(CSS.supports('overflow-anchor: auto'));
        const scrollCompensationEndIndex = useRef(null);
        const topStyle = useMemo(() => {
            const topHeight = cache.current
                .slice(MIN_INDEX, startIndex)
                .reduce((sum, next) => sum + next, startIndex * (itemMinHeight + marginBottom));

            return {
                minHeight: topHeight,
                height: topHeight,
                maxHeight: topHeight,
                overflowAnchor: 'none',
                pointerEvents: 'none',
                userSelect: 'none',
                padding: 0,
                margin: 0
            };
        }, [startIndex, itemMinHeight, marginBottom]);
        const bottomStyle = useMemo(() => {
            const bottomHeight = cache.current
                .slice(endIndex + 1, maxIndex)
                .reduce((sum, next) => sum + next, (itemMinHeight + marginBottom) * (maxIndex - endIndex));

            return {
                minHeight: bottomHeight,
                height: bottomHeight,
                maxHeight: bottomHeight,
                overflowAnchor: 'none',
                pointerEvents: 'none',
                userSelect: 'none',
                padding: 0,
                margin: 0
            };
        }, [endIndex, maxIndex, itemMinHeight, marginBottom]);
        const slicedItems = useMemo(
            () => items.slice(startIndex, endIndex + 1).map((item, index) => children(item, startIndex + index)),
            [items, startIndex, endIndex, children]
        );

        step.current = () => {
            const firstElement = topRef.current.nextSibling;

            if (scrollToIndex.current) {
                const targetIndex = normalizeValue(MIN_INDEX, scrollToIndex.current.index, maxIndex);

                if (startIndex !== targetIndex) {
                    setIndexes([targetIndex, targetIndex]);

                    return;
                }

                firstElement.scrollIntoView(scrollToIndex.current.alignToTop);
                scrollToIndex.current = null;

                return;
            }

            const clientHeight = document.documentElement.clientHeight;
            const viewPortRect = viewPortRef && viewPortRef.current && viewPortRef.current.getBoundingClientRect();
            const viewPortTop = viewPortRect ? normalizeValue(MIN_INDEX, viewPortRect.top, clientHeight) : MIN_INDEX;
            const viewPortBottom = viewPortRect
                ? normalizeValue(MIN_INDEX, viewPortRect.bottom, clientHeight)
                : clientHeight;
            const overscanHeight = overscan * (itemMinHeight + marginBottom);
            const topLimit = viewPortTop - overscanHeight;
            const bottomLimit = viewPortBottom + overscanHeight;
            const firstElementRect = firstElement.getBoundingClientRect();
            const lastElementRect = bottomRef.current.previousSibling.getBoundingClientRect();

            let nextStartIndex = startIndex;
            let nextEndIndex = endIndex;

            if (firstElementRect.top >= bottomLimit) {
                let diff = firstElementRect.top - bottomLimit;
                --nextStartIndex;

                while (diff >= 0 && nextStartIndex >= MIN_INDEX) {
                    diff -= cache.current[nextStartIndex] || itemMinHeight;
                    --nextStartIndex;
                }

                scrollCompensationEndIndex.current = startIndex;
                nextEndIndex = nextStartIndex;
            } else if (lastElementRect.bottom + marginBottom <= topLimit) {
                let diff = topLimit - lastElementRect.bottom + marginBottom;
                nextStartIndex = endIndex + 1;

                while (diff >= 0 && nextStartIndex <= maxIndex) {
                    diff -= cache.current[nextStartIndex] || itemMinHeight;
                    ++nextStartIndex;
                }

                nextEndIndex = nextStartIndex;
            } else {
                if (firstElementRect.bottom + marginBottom < topLimit) {
                    ++nextStartIndex;
                } else if (firstElementRect.top >= topLimit) {
                    scrollCompensationEndIndex.current = startIndex;
                    --nextStartIndex;
                }

                if (lastElementRect.bottom + marginBottom <= bottomLimit) {
                    ++nextEndIndex;
                } else if (lastElementRect.top > bottomLimit) {
                    --nextEndIndex;
                }
            }

            nextStartIndex = normalizeValue(MIN_INDEX, nextStartIndex, maxIndex);
            nextEndIndex = normalizeValue(nextStartIndex, nextEndIndex, maxIndex);

            if (nextStartIndex !== startIndex || nextEndIndex !== endIndex) {
                let index = startIndex;
                let element = firstElement;

                while (index <= endIndex && element !== bottomRef.current) {
                    cache.current[index] = element.clientHeight;
                    element = element.nextSibling;
                    ++index;
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
            if (scrollCompensationEndIndex.current === null) {
                return;
            }

            if (!viewPortRef || isOverflowAnchorSupported.current) {
                scrollCompensationEndIndex.current = null;

                return;
            }

            let index = startIndex;
            let element = topRef.current.nextSibling;
            let heightDiff = 0;

            while (index < scrollCompensationEndIndex.current && element !== bottomRef.current) {
                heightDiff += element.clientHeight - (cache.current[index] || 0) - itemMinHeight;
                element = element.nextSibling;
                ++index;
            }

            if (viewPortRef && heightDiff) {
                viewPortRef.current.style.overflowY = 'hidden';
                viewPortRef.current.scrollTop += heightDiff;
                viewPortRef.current.style.overflowY = null;
            }

            scrollCompensationEndIndex.current = null;
        }, [viewPortRef, startIndex, itemMinHeight]);

        useEffect(() => {
            let frameId = MIN_INDEX;
            const frame = () => {
                frameId = requestAnimationFrame(frame);
                step.current();
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
