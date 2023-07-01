import { useMemo, MutableRefObject, RefObject } from 'react';
import { findNearestScrollableElement } from './utils';

export const useAutoViewport = ({
    viewportRef,
    axis,
    topSpacerRef,
}: {
    viewportRef?:
        | MutableRefObject<HTMLElement | null>
        | RefObject<HTMLElement | null>
        | { current: HTMLElement | null }
        | null;
    axis: 'y' | 'x';
    topSpacerRef: MutableRefObject<any>;
}) => {
    return useMemo(() => {
        let viewport: any = null;
        const autoViewportRef = {};

        Object.defineProperty(autoViewportRef, 'current', {
            get: () => {
                if (viewportRef) {
                    viewport = null;

                    if (viewportRef.current === document.body) {
                        return document.documentElement;
                    }

                    return viewportRef.current;
                }

                if (viewport && viewport.isConnected) {
                    return viewport;
                }

                const topSpacer = topSpacerRef.current;

                if (!topSpacer) {
                    return null;
                }

                viewport = findNearestScrollableElement(topSpacer.parentNode, axis);

                return viewport;
            },
        });

        return autoViewportRef as MutableRefObject<any>;
    }, [axis, topSpacerRef, viewportRef]);
};
