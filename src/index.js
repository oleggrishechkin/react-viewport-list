import React, { useMemo, useRef, useEffect, useState } from 'react';

const ViewPortList = ({
    viewPortRef = React.createRef(),
    elementsCount = 0,
    elementHeight = 0,
    margin = 0,
    children = null
}) => {
    const ref = useRef(null);
    const [[startIndex, endIndex], setIndexes] = useState([0, 0]);
    const elementHeightWithMargin = elementHeight + margin;

    useEffect(() => {
        let frameId;
        const frame = () => {
            if (ref.current && viewPortRef.current) {
                setIndexes((currentIndexes) => {
                    const viewPortRect = viewPortRef.current.getBoundingClientRect();
                    const minElementsCount = Math.min(
                        Math.ceil(viewPortRect.height / elementHeightWithMargin),
                        elementsCount
                    );
                    const nextStartIndex = Math.min(
                        Math.max(
                            Math.floor(
                                (viewPortRect.top -
                                    ref.current.getBoundingClientRect().top +
                                    currentIndexes[0] * elementHeightWithMargin) /
                                    elementHeightWithMargin
                            ),
                            0
                        ),
                        elementsCount - minElementsCount
                    );
                    const nextEndIndex = Math.min(nextStartIndex + minElementsCount, elementsCount - 1);

                    return nextStartIndex === currentIndexes[0] && nextEndIndex === currentIndexes[1]
                        ? currentIndexes
                        : [nextStartIndex, nextEndIndex];
                });
            }

            frameId = requestAnimationFrame(frame);
        };

        frame();

        return () => cancelAnimationFrame(frameId);
    }, [elementHeightWithMargin, elementsCount, viewPortRef]);

    return useMemo(() => {
        if (!elementsCount || !children) {
            return false;
        }

        const result = [];

        console.log(startIndex, endIndex);
        for (let index = startIndex; index <= endIndex; ++index) {
            result.push(
                children({
                    innerRef: index === startIndex ? ref : undefined,
                    index,
                    style: {
                        marginTop: index === startIndex ? startIndex * elementHeightWithMargin : undefined,
                        marginBottom:
                            index === endIndex ? (elementsCount - 1 - endIndex) * elementHeightWithMargin : margin
                    }
                })
            );
        }

        return result;
    }, [children, elementHeightWithMargin, elementsCount, endIndex, margin, startIndex]);
};

export default React.memo(ViewPortList);
