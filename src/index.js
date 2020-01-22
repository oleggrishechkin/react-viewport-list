/* eslint-disable react/prop-types */
import React, { useState, useRef, useEffect, useMemo, Fragment } from 'react';

const MIN_START_INDEX = 1;

const ViewPortList = ({
    viewPortRef = { current: document.documentElement },
    listLength = 0,
    itemMinHeight = 1,
    margin = 0,
    overscan = 0,
    scrollToIndex = -1,
    children = null
}) => {
    const itemMinHeightWithMargin = itemMinHeight + margin;
    const [startIndex, setStartIndex] = useState(MIN_START_INDEX);
    const [maxVisibleItemsCount, setMaxVisibleItemsCount] = useState(0);
    const maxIndex = listLength - 2;
    const maxStartIndex = Math.max(maxIndex - maxVisibleItemsCount, MIN_START_INDEX);
    const normalizedStartIndex = Math.min(startIndex, maxStartIndex);
    const endIndex = Math.min(normalizedStartIndex + maxVisibleItemsCount, maxIndex);
    const startRef = useRef(null);
    const scrollRef = useRef(null);
    const variables = useRef({
        scrolledToIndex: -1,
        inc: 1,
        dec: 1,
        stepFunc: () => {},
        cache: []
    });

    variables.current.stepFunc = () => {
        if (!viewPortRef.current) {
            variables.current.inc = 1;
            variables.current.dec = 1;

            return;
        }

        const viewPortRefRect = viewPortRef.current.getBoundingClientRect();

        setMaxVisibleItemsCount(
            Math.ceil(viewPortRefRect.height / itemMinHeightWithMargin) +
                Math.ceil(overscan / itemMinHeightWithMargin) * 2
        );

        if (startIndex !== normalizedStartIndex) {
            setStartIndex(normalizedStartIndex);
            variables.current.inc = 1;
            variables.current.dec = 1;

            return;
        }

        if (scrollToIndex !== variables.current.scrolledToIndex) {
            variables.current.inc = 1;
            variables.current.dec = 1;

            if (scrollToIndex < 0 || scrollToIndex > maxIndex) {
                variables.current.scrolledToIndex = scrollToIndex;

                return;
            }

            if (scrollToIndex >= startIndex && scrollToIndex <= endIndex && (scrollRef.current || startRef.current)) {
                (scrollRef.current || startRef.current).scrollIntoView();
                variables.current.scrolledToIndex = scrollToIndex;

                return;
            }

            setStartIndex(
                Math.min(
                    Math.max(scrollToIndex - Math.ceil(overscan / itemMinHeightWithMargin), MIN_START_INDEX),
                    maxStartIndex
                )
            );

            return;
        }

        if (!startRef.current || listLength <= maxVisibleItemsCount) {
            variables.current.inc = 1;
            variables.current.dec = 1;

            return;
        }

        const startRefRect = startRef.current.getBoundingClientRect();
        const topLimit = viewPortRefRect.top - overscan;

        variables.current.cache[startIndex] = startRefRect.height - itemMinHeight;

        if (startRefRect.bottom < topLimit) {
            setStartIndex(Math.min(startIndex + variables.current.inc, maxStartIndex));
            variables.current.inc = variables.current.inc * 2;
            variables.current.dec = 1;

            return;
        }

        if (startRefRect.top > topLimit) {
            setStartIndex(Math.max(startIndex - variables.current.dec, MIN_START_INDEX));
            variables.current.inc = 1;
            variables.current.dec = variables.current.dec * 2;

            return;
        }

        variables.current.inc = 1;
        variables.current.dec = 1;
    };

    useEffect(() => {
        let frameId = 0;
        const frame = () => {
            frameId = requestAnimationFrame(frame);
            variables.current.stepFunc();
        };

        frame();

        return () => cancelAnimationFrame(frameId);
    }, []);

    const items = useMemo(() => {
        if (!children) {
            return false;
        }

        const result = [];

        if (listLength > 0) {
            result.push(
                children({
                    innerRef: 0 === scrollToIndex ? scrollRef : undefined,
                    index: 0,
                    style: {
                        marginBottom:
                            Math.max(normalizedStartIndex - 1, 0) * itemMinHeightWithMargin +
                            margin +
                            variables.current.cache.slice(0, normalizedStartIndex).reduce((acc, curr) => acc + curr, 0)
                    }
                })
            );
        }

        for (let index = normalizedStartIndex; index <= endIndex; ++index) {
            result.push(
                children({
                    innerRef:
                        index === normalizedStartIndex ? startRef : index === scrollToIndex ? scrollRef : undefined,
                    index,
                    style: {
                        marginBottom: margin
                    }
                })
            );
        }

        if (listLength > 1) {
            result.push(
                children({
                    innerRef: listLength - 1 === scrollToIndex ? scrollRef : undefined,
                    index: listLength - 1,
                    style: {
                        marginTop: Math.max(maxIndex - endIndex, 0) * itemMinHeightWithMargin + margin
                    }
                })
            );
        }

        return result;
    }, [
        children,
        endIndex,
        itemMinHeightWithMargin,
        listLength,
        margin,
        maxIndex,
        normalizedStartIndex,
        scrollToIndex
    ]);

    return <Fragment>{items}</Fragment>;
};

export default ViewPortList;
