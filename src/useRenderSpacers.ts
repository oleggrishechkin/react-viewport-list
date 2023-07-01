import { CSSProperties, MutableRefObject } from 'react';
import { getStyle } from './utils';
import { PROP_NAME_FOR_X_AXIS, PROP_NAME_FOR_Y_AXIS } from './contants';

export const useRenderSpacers = ({
    propName,
    topSpacerRef,
    bottomSpacerRef,
    cacheRef,
    marginTopRef,
    withCache,
    itemHeight,
    itemMargin,
    maxIndex,
    startIndex,
    endIndex,
    renderSpacer,
}: {
    propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS;
    topSpacerRef: MutableRefObject<any>;
    bottomSpacerRef: MutableRefObject<any>;
    cacheRef: MutableRefObject<number[]>;
    marginTopRef: MutableRefObject<number>;
    withCache: boolean;
    itemHeight: number;
    itemMargin: number;
    maxIndex: number;
    startIndex: number;
    endIndex: number;
    renderSpacer: (props: { ref: MutableRefObject<any>; style: CSSProperties; type: 'top' | 'bottom' }) => any;
}) =>
    [
        renderSpacer({
            ref: topSpacerRef,
            style: getStyle(
                propName,
                (withCache ? cacheRef.current : [])
                    .slice(0, startIndex)
                    .reduce((sum, next) => sum + (next - itemHeight), startIndex * (itemHeight + itemMargin)),
                marginTopRef.current,
            ),
            type: 'top',
        }),
        renderSpacer({
            ref: bottomSpacerRef,
            style: getStyle(
                propName,
                (withCache ? cacheRef.current : [])
                    .slice(endIndex + 1, maxIndex + 1)
                    .reduce(
                        (sum, next) => sum + (next - itemHeight),
                        (itemHeight + itemMargin) * (maxIndex - endIndex),
                    ),
            ),
            type: 'bottom',
        }),
    ] as const;
