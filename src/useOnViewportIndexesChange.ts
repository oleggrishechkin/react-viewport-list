import { useRef } from 'react';
import { findElement } from './utils';
import { PROP_NAME_FOR_X_AXIS, PROP_NAME_FOR_Y_AXIS } from './contants';

export const useOnViewportIndexesChange = ({
    onViewportIndexesChange,
}: {
    onViewportIndexesChange?: (viewportIndexes: [number, number]) => void;
}) => {
    const viewportIndexesRef = useRef<[number, number]>([-1, -1]);
    const mainFrame = ({
        propName,
        topElement,
        bottomElement,
        topSpacer,
        bottomSpacer,
        startIndex,
        endIndex,
        getItemBoundingClientRect,
        limits,
    }: {
        propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS;
        viewport: any;
        topElement: Element;
        bottomElement: Element;
        topSpacer: any;
        bottomSpacer: any;
        startIndex: number;
        endIndex: number;
        getItemBoundingClientRect: (element: Element) =>
            | DOMRect
            | {
                  bottom: number;
                  left: number;
                  right: number;
                  top: number;
                  width: number;
                  height: number;
              };
        limits: { [p: string]: number };
    }) => {
        if (!onViewportIndexesChange) {
            return false;
        }

        let [, startViewportIndex] = findElement({
            fromElement: topElement,
            toElement: bottomSpacer,
            fromIndex: startIndex,
            compare: (element) => getItemBoundingClientRect(element)[propName.bottom] > limits[propName.top],
        });

        if (startViewportIndex === -1) {
            startViewportIndex = startIndex;
        }

        let [, endViewportIndex] = findElement({
            fromElement: bottomElement,
            toElement: topSpacer,
            fromIndex: endIndex,
            asc: false,
            compare: (element) => getItemBoundingClientRect(element)[propName.top] < limits[propName.bottom],
        });

        if (endViewportIndex === -1) {
            endViewportIndex = endIndex;
        }

        if (
            startViewportIndex !== viewportIndexesRef.current[0] ||
            endViewportIndex !== viewportIndexesRef.current[1]
        ) {
            viewportIndexesRef.current = [startViewportIndex, endViewportIndex];
            onViewportIndexesChange(viewportIndexesRef.current);
        }

        return false;
    };

    return [mainFrame] as const;
};
