import { MutableRefObject } from 'react';
import { IS_TOUCH_DEVICE, IS_OVERFLOW_ANCHOR_SUPPORTED, PROP_NAME_FOR_Y_AXIS, PROP_NAME_FOR_X_AXIS } from './contants';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { findElement } from './utils';

export const useScrollCompensation = ({
    propName,
    maxIndex,
    cacheRef,
    viewportRef,
    topSpacerRef,
    bottomSpacerRef,
    getItemBoundingClientRect,
    startIndex,
    endIndex,
    overflowAnchor,
    withCache,
    itemHeight,
    itemMargin,
    addMarginTop,
    anchorRef,
}: {
    propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS;
    maxIndex: number;
    cacheRef: MutableRefObject<number[]>;
    viewportRef: MutableRefObject<any>;
    topSpacerRef: MutableRefObject<any>;
    bottomSpacerRef: MutableRefObject<any>;
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
    startIndex: number;
    endIndex: number;
    overflowAnchor: 'auto' | 'none';
    withCache: boolean;
    itemHeight: number;
    itemMargin: number;
    addMarginTop: (offset: number) => void;
    anchorRef: MutableRefObject<{ element: Element; index: number; force?: boolean } | null>;
}) => {
    let anchorHeightOnRender: number | undefined;

    if (anchorRef.current?.element && viewportRef.current && topSpacerRef.current) {
        anchorHeightOnRender =
            getItemBoundingClientRect(anchorRef.current?.element)[propName.top] -
            (viewportRef.current === document.documentElement
                ? 0
                : viewportRef.current.getBoundingClientRect()[propName.top]);
    }

    useIsomorphicLayoutEffect(() => {
        const anchor = anchorRef.current;

        anchorRef.current = null;

        const viewport = viewportRef.current;
        const topSpacer = topSpacerRef.current;
        const bottomSpacer = bottomSpacerRef.current;

        if (
            !anchor ||
            anchor.index === -1 ||
            !viewport ||
            !topSpacer ||
            !bottomSpacer ||
            anchorHeightOnRender === undefined ||
            (IS_OVERFLOW_ANCHOR_SUPPORTED && overflowAnchor !== 'none' && !anchor.force)
        ) {
            return;
        }

        let top = null;

        if (anchor.index >= startIndex && anchor.index <= endIndex) {
            const [anchorElement] = findElement({
                fromElement: topSpacer.nextSibling as Element,
                toElement: bottomSpacer,
                fromIndex: startIndex,
                compare: (_, index) => index === anchor.index,
            });

            if (anchorElement) {
                top = getItemBoundingClientRect(anchorElement)[propName.top];
            }
        } else {
            if (anchor.index < startIndex) {
                top =
                    topSpacer.getBoundingClientRect()[propName.top] +
                    (withCache ? cacheRef.current : [])
                        .slice(0, anchor.index)
                        .reduce((sum, next) => sum + (next - itemHeight), anchor.index * (itemHeight + itemMargin));
            } else if (anchor.index <= maxIndex) {
                top =
                    bottomSpacer.getBoundingClientRect()[propName.top] +
                    (withCache ? cacheRef.current : [])
                        .slice(endIndex + 1, anchor.index)
                        .reduce(
                            (sum, next) => sum + (next - itemHeight),
                            (itemHeight + itemMargin) * (anchor.index - 1 - endIndex),
                        );
            }
        }

        if (top === null) {
            return;
        }

        const offset =
            top -
            (viewport === document.documentElement ? 0 : viewport.getBoundingClientRect()[propName.top]) -
            anchorHeightOnRender;

        if (!offset) {
            return;
        }

        if (IS_TOUCH_DEVICE) {
            addMarginTop(offset);

            return;
        }

        viewport[propName.scrollTop] += offset;
    }, [startIndex]);
};
