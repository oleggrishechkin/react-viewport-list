import { MutableRefObject } from 'react';
import { PROP_NAME_FOR_Y_AXIS, PROP_NAME_FOR_X_AXIS } from './contants';
import { findElement } from './utils';

export const useGetScrollPosition =
    ({
        propName,
        viewportRef,
        topSpacerRef,
        bottomSpacerRef,
        startIndex,
        getItemBoundingClientRect,
    }: {
        propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS;
        viewportRef: MutableRefObject<any>;
        topSpacerRef: MutableRefObject<any>;
        bottomSpacerRef: MutableRefObject<any>;
        startIndex: number;
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
    }) =>
    () => {
        const viewport = viewportRef.current;
        const topSpacer = topSpacerRef.current;
        const bottomSpacer = bottomSpacerRef.current;
        let scrollIndex = -1;
        let scrollOffset = 0;

        if (!viewport || !topSpacer || !bottomSpacer) {
            return { index: scrollIndex, offset: scrollOffset };
        }

        const topElement = topSpacer.nextSibling as Element;
        const viewportRect = viewport.getBoundingClientRect();
        const limits = {
            [propName.top]: viewport === document.documentElement ? 0 : viewportRect[propName.top],
            [propName.bottom]:
                viewport === document.documentElement
                    ? document.documentElement[propName.clientHeight]
                    : viewportRect[propName.bottom],
        };

        findElement({
            fromElement: topElement,
            toElement: bottomSpacer,
            fromIndex: startIndex,
            compare: (element, index) => {
                const rect = getItemBoundingClientRect(element);

                scrollIndex = index;
                scrollOffset = limits[propName.top] - rect[propName.top];

                return rect[propName.bottom] > limits[propName.top];
            },
        });

        return { index: scrollIndex, offset: scrollOffset };
    };
