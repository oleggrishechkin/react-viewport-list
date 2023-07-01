import { useRef, MutableRefObject } from 'react';
import { PROP_NAME_FOR_Y_AXIS, PROP_NAME_FOR_X_AXIS } from './contants';
import { findElement } from './utils';

export const useAnchor = ({
    propName,
    cacheRef,
    getItemBoundingClientRect,
}: {
    propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS;
    cacheRef: MutableRefObject<number[]>;
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
}) => {
    const anchorRef = useRef<{ element: Element; index: number; force?: boolean } | null>(null);
    const findAnchor = ({
        bottomSpacer,
        topElement,
        bottomElement,
        nextStartIndex,
        startIndex,
        endIndex,
        itemHeight,
    }: {
        bottomSpacer: any;
        topElement: Element;
        bottomElement: Element;
        nextStartIndex: number;
        startIndex: number;
        endIndex: number;
        itemHeight: number;
    }) => {
        if (startIndex >= nextStartIndex) {
            return {
                element: topElement,
                index: startIndex,
            };
        }

        const [anchorElement, anchorElementIndex] = findElement({
            fromElement: topElement,
            toElement: bottomSpacer,
            fromIndex: startIndex,
            compare: (element, index) => {
                if (index === nextStartIndex) {
                    return true;
                }

                const elementRect = getItemBoundingClientRect(element);

                if (elementRect[propName.height] !== itemHeight) {
                    cacheRef.current[index] = elementRect[propName.height];
                }

                return false;
            },
        });

        return anchorElement
            ? { element: anchorElement, index: anchorElementIndex }
            : { element: bottomElement, index: endIndex };
    };

    return [anchorRef, findAnchor] as const;
};
