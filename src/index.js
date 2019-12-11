import React, { useState, useRef, useEffect, useMemo, Fragment } from 'react';

// eslint-disable-next-line react/prop-types
const ViewPortList = ({ listLength = 0, itemMinHeight = 1, margin = 0, children = null, scrollToIndex = -1 }) => {
    const itemMinHeightWithMargin = itemMinHeight + margin;
    const maxIndex = listLength - 1;
    const [startIndex, setStartIndex] = useState(0);
    const [windowHeight, setWindowHeight] = useState(document.documentElement.clientHeight);
    const maxVisibleItemsCount = Math.ceil(windowHeight / itemMinHeight) * 2;
    const normalizedStartIndex = Math.min(startIndex, Math.max(maxIndex - maxVisibleItemsCount, 0));
    const endIndex = Math.min(normalizedStartIndex + maxVisibleItemsCount, maxIndex);
    const startRef = useRef(null);
    const scrollRef = useRef(null);
    const variables = useRef({
        scrolledToIndex: -1,
        inc: 1,
        dec: 1,
        stepFunc: () => {}
    });

    variables.current.stepFunc = () => {
        if (!startRef.current) {
            variables.current.inc = 1;
            variables.current.dec = 1;

            return;
        }

        const startRefRect = startRef.current.getBoundingClientRect();

        if (startIndex > Math.max(maxIndex - maxVisibleItemsCount)) {
            setStartIndex(Math.max(maxIndex - maxVisibleItemsCount, 0));
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

            if (scrollToIndex >= startIndex && scrollToIndex <= endIndex) {
                (scrollRef.current || startRef.current).scrollIntoView();
                variables.current.scrolledToIndex = scrollToIndex;

                return;
            }

            setStartIndex(
                Math.min(
                    Math.max(scrollToIndex - Math.floor(maxVisibleItemsCount / 2), 0),
                    Math.max(maxIndex - maxVisibleItemsCount, 0)
                )
            );

            return;
        }

        if (startRefRect.bottom < -windowHeight) {
            setStartIndex(Math.min(startIndex + variables.current.inc, Math.max(maxIndex - maxVisibleItemsCount, 0)));
            variables.current.inc = variables.current.inc * 2;
            variables.current.dec = 1;

            return;
        }

        if (startRefRect.top > -windowHeight) {
            setStartIndex(Math.max(startIndex - variables.current.dec, 0));
            variables.current.inc = 1;
            variables.current.dec = variables.current.dec * 2;

            return;
        }

        variables.current.inc = 1;
        variables.current.dec = 1;
    };

    useEffect(() => {
        const onResize = () => {
            setWindowHeight(document.documentElement.clientHeight);
        };

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, [itemMinHeight]);

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

        for (let index = normalizedStartIndex; index <= endIndex; ++index) {
            result.push(
                children({
                    innerRef:
                        index === normalizedStartIndex ? startRef : index === scrollToIndex ? scrollRef : undefined,
                    index,
                    style: {
                        marginTop:
                            index === normalizedStartIndex ? normalizedStartIndex * itemMinHeightWithMargin : undefined,
                        marginBottom: index === endIndex ? (maxIndex - endIndex) * itemMinHeightWithMargin : margin
                    }
                })
            );
        }

        return result;
    }, [children, endIndex, itemMinHeightWithMargin, margin, maxIndex, normalizedStartIndex, scrollToIndex]);

    return <Fragment>{items}</Fragment>;
};

export default ViewPortList;
