import { MutableRefObject, useMemo, useRef } from 'react';
import { normalizeValue } from './utils';

export const useShift = ({
    anchorRef,
    indexes,
    indexesShift,
    topSpacerRef,
    maxIndex,
}: {
    anchorRef: MutableRefObject<{ element: Element; index: number; force?: boolean } | null>;
    indexes: [number, number];
    indexesShift: number;
    topSpacerRef: MutableRefObject<any>;
    maxIndex: number;
}) => {
    const lastIndexesShiftRef = useRef(indexesShift);

    return useMemo(() => {
        indexes[0] = normalizeValue(0, indexes[0], maxIndex);
        indexes[1] = normalizeValue(indexes[0], indexes[1], maxIndex);

        const shift = indexesShift - lastIndexesShiftRef.current;

        lastIndexesShiftRef.current = indexesShift;

        const topSpacer = topSpacerRef.current;

        if (topSpacer && shift) {
            indexes[0] = normalizeValue(0, indexes[0] + shift, maxIndex);
            indexes[1] = normalizeValue(indexes[0], indexes[1] + shift, maxIndex);
            anchorRef.current = {
                element: topSpacer.nextSibling as Element,
                index: indexes[0],
                force: true,
            };
        }

        return indexes;
    }, [indexes, maxIndex, indexesShift, topSpacerRef, anchorRef]);
};
