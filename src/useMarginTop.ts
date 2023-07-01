import { useRef, MutableRefObject } from 'react';
import { PROP_NAME_FOR_Y_AXIS, PROP_NAME_FOR_X_AXIS } from './contants';

export const useMarginTop = ({
    propName,
    topSpacerRef,
}: {
    propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS;
    topSpacerRef: MutableRefObject<any>;
}) => {
    const marginTopRef = useRef(0);
    const mainFrame = ({
        propName,
        viewport,
        topSpacer,
        topSpacerRect,
        limitsWithOverscanSize,
        isScrollingToIndex,
    }: {
        propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS;
        viewport: any;
        topSpacer: any;
        topSpacerRect: DOMRect;
        limitsWithOverscanSize: { [p: string]: number };
        isScrollingToIndex: () => boolean;
    }) => {
        if (
            (marginTopRef.current < 0 &&
                topSpacerRect[propName.top] - marginTopRef.current >= limitsWithOverscanSize[propName.top]) ||
            (marginTopRef.current > 0 && topSpacerRect[propName.top] >= limitsWithOverscanSize[propName.top]) ||
            (marginTopRef.current && isScrollingToIndex())
        ) {
            topSpacer.style[propName.marginTop] = '0px';
            viewport.style[propName.overflowY] = 'hidden';
            viewport[propName.scrollTop] += -marginTopRef.current;
            viewport.style[propName.overflowY] = '';
            marginTopRef.current = 0;

            return true;
        }

        return false;
    };
    const addMarginTop = (offset: number) => {
        if (topSpacerRef.current) {
            marginTopRef.current -= offset;
            topSpacerRef.current.style[propName.marginTop] = `${marginTopRef.current}px`;
        }
    };

    return [marginTopRef, addMarginTop, mainFrame] as const;
};
