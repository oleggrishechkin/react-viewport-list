import { useState } from 'react';
import { PROP_NAME_FOR_Y_AXIS, PROP_NAME_FOR_X_AXIS } from './contants';
import { findElement } from './utils';

export const useAutoItemHeightAndMargin = ({ itemHeight, itemMargin }: { itemHeight: number; itemMargin: number }) => {
    const [[autoItemHeight, autoItemMargin], setHeightAndMargin] = useState(() => [itemHeight, itemMargin]);
    const mainFrame = ({
        propName,
        topElement,
        topSpacerRect,
        bottomSpacerRect,
        bottomSpacer,
        startIndex,
        endIndex,
        getItemBoundingClientRect,
    }: {
        propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS;
        topElement: Element;
        topSpacerRect: DOMRect;
        bottomSpacerRect: DOMRect;
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
    }) => {
        if (autoItemHeight !== 0 && autoItemMargin !== -1) {
            return false;
        }

        let itemsHeightSum = 0;

        findElement({
            fromElement: topElement,
            toElement: bottomSpacer,
            fromIndex: startIndex,
            compare: (element) => {
                itemsHeightSum += getItemBoundingClientRect(element)[propName.height];

                return false;
            },
        });

        if (!itemsHeightSum) {
            return true;
        }

        const renderedItemsCount = endIndex - startIndex + 1;
        const nextItemHeight = autoItemHeight === 0 ? Math.ceil(itemsHeightSum / renderedItemsCount) : autoItemHeight;
        const nextItemMargin =
            autoItemMargin === -1
                ? Math.ceil(
                      (bottomSpacerRect[propName.top] - topSpacerRect[propName.bottom] - itemsHeightSum) /
                          renderedItemsCount,
                  )
                : autoItemMargin;

        setHeightAndMargin([nextItemHeight, nextItemMargin]);

        return true;
    };

    return [autoItemHeight, autoItemMargin, mainFrame] as const;
};
