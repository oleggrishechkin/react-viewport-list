/* eslint-disable react/prop-types */
import React, { useState, useRef, useEffect, useMemo, Fragment, useImperativeHandle } from 'react';

const MIN_START_INDEX = 1;

const ViewPortList = React.forwardRef(
    (
        {
            viewPortRef = { current: document.documentElement },
            listLength = 0,
            itemMinHeight = 1,
            margin = 0,
            overscan = 0,
            children = null
        },
        ref
    ) => {
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
            scrollToIndex: null,
            stepFunc: () => {},
            cache: []
        });

        variables.current.stepFunc = () => {
            if (!viewPortRef.current) {
                return;
            }

            const viewPortRefRect = viewPortRef.current.getBoundingClientRect();

            setMaxVisibleItemsCount(
                Math.ceil(viewPortRefRect.height / itemMinHeightWithMargin) +
                    Math.ceil(overscan / itemMinHeightWithMargin) * 2
            );

            if (startIndex !== normalizedStartIndex) {
                setStartIndex(normalizedStartIndex);

                return;
            }

            if (variables.current.scrollToIndex) {
                if (
                    variables.current.scrollToIndex.index < 0 ||
                    variables.current.scrollToIndex.index > listLength - 1
                ) {
                    variables.current.scrollToIndex = null;

                    return;
                }

                const targetIndex = Math.min(
                    Math.max(
                        variables.current.scrollToIndex.index - Math.ceil(overscan / itemMinHeightWithMargin),
                        MIN_START_INDEX
                    ),
                    maxStartIndex
                );

                if (startIndex === targetIndex && (scrollRef.current || startRef.current)) {
                    (scrollRef.current || startRef.current).scrollIntoView(variables.current.scrollToIndex.toTop);
                    variables.current.scrollToIndex = null;

                    return;
                }

                setStartIndex(targetIndex);

                return;
            }

            if (!startRef.current || listLength <= maxVisibleItemsCount) {
                return;
            }

            const startRefRect = startRef.current.getBoundingClientRect();
            const topLimit = viewPortRefRect.top - overscan;

            variables.current.cache[startIndex] = startRefRect.height - itemMinHeight;

            if (startRefRect.bottom < topLimit) {
                const diff = Math.max(Math.floor((topLimit - startRefRect.bottom) / itemMinHeightWithMargin), 1);

                setStartIndex(Math.min(startIndex + (diff > maxVisibleItemsCount ? diff : 1), maxStartIndex));

                return;
            }

            if (startRefRect.top > topLimit) {
                const diff = Math.max(Math.floor((startRefRect.top - topLimit) / itemMinHeightWithMargin), 1);

                setStartIndex(Math.max(startIndex - (diff > maxVisibleItemsCount ? diff : 1), MIN_START_INDEX));
            }
        };

        useImperativeHandle(
            ref,
            () => ({
                scrollToIndex: (index = -1, toTop = true) => {
                    variables.current.scrollToIndex = { index, toTop };
                }
            }),
            []
        );

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
                        innerRef:
                            !!variables.current.scrollToIndex && 0 === variables.current.scrollToIndex.index
                                ? scrollRef
                                : undefined,
                        index: 0,
                        style: {
                            marginBottom: variables.current.cache
                                .slice(0, normalizedStartIndex)
                                .reduce(
                                    (acc, curr) => acc + curr,
                                    Math.max(normalizedStartIndex - 1, 0) * itemMinHeightWithMargin + margin
                                )
                        }
                    })
                );
            }

            for (let index = normalizedStartIndex; index <= endIndex; ++index) {
                result.push(
                    children({
                        innerRef:
                            index === normalizedStartIndex
                                ? startRef
                                : !!variables.current.scrollToIndex && index === variables.current.scrollToIndex.index
                                ? scrollRef
                                : undefined,
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
                        innerRef:
                            !!variables.current.scrollToIndex &&
                            listLength - 1 === variables.current.scrollToIndex.index
                                ? scrollRef
                                : undefined,
                        index: listLength - 1,
                        style: {
                            marginTop: Math.max(maxIndex - endIndex, 0) * itemMinHeightWithMargin
                        }
                    })
                );
            }

            return result;
        }, [children, endIndex, itemMinHeightWithMargin, listLength, margin, maxIndex, normalizedStartIndex]);

        return <Fragment>{items}</Fragment>;
    }
);

export default ViewPortList;
