import {
    CSSProperties,
    ForwardedRef,
    forwardRef,
    Fragment,
    MutableRefObject,
    RefObject,
    useCallback,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

export const STYLE_PROPERTIES_FOR_X_AXIS = {
    top: 'left',
    bottom: 'right',
    scrollHeight: 'scrollWidth',
    clientHeight: 'clientWidth',
    scrollTop: 'scrollLeft',
    overflowY: 'overflowX',
    minHeight: 'minWidth',
    height: 'width',
    maxHeight: 'maxWidth',
    marginTop: 'marginLeft',
    innerHeight: 'innerWidth',
} as const;

export const STYLE_PROPERTIES_FOR_Y_AXIS = {
    top: 'top',
    bottom: 'bottom',
    clientHeight: 'clientHeight',
    scrollHeight: 'scrollHeight',
    scrollTop: 'scrollTop',
    overflowY: 'overflowY',
    height: 'height',
    minHeight: 'minHeight',
    maxHeight: 'maxHeight',
    marginTop: 'marginTop',
    innerHeight: 'innerHeight',
} as const;

const range = (from: number, to: number) => {
    const array = [];

    for (let index = from; index < to; index++) {
        array.push(index);
    }

    return array;
};

const normalizeNumber = (min: number, value: number, max = Infinity) => Math.max(Math.min(value, max), min);

const getSpacerStyle = ({
    styleProperties,
    height,
    marginTop,
}: {
    styleProperties: typeof STYLE_PROPERTIES_FOR_X_AXIS | typeof STYLE_PROPERTIES_FOR_Y_AXIS;
    height: number;
    marginTop?: number;
}): CSSProperties => ({
    padding: 0,
    margin: 0,
    border: 'none',
    visibility: 'hidden',
    overflowAnchor: 'none',
    [styleProperties.minHeight]: height,
    [styleProperties.height]: height,
    [styleProperties.maxHeight]: height,
    [styleProperties.marginTop]: marginTop,
});

const findElement = ({
    fromElement,
    toElement,
    fromIndex,
    asc = true,
    compare,
}: {
    fromElement: Element;
    toElement: Element;
    fromIndex: number;
    asc?: boolean;
    compare: (element: Element, index: number) => boolean;
}) => {
    let index = fromIndex;
    let element: Element | null = fromElement;

    while (element && element !== toElement) {
        if (compare(element, index)) {
            return [element, index] as const;
        }

        if (asc) {
            index++;
            element = element.nextSibling as Element | null;
        } else {
            index--;
            element = element.previousSibling as Element | null;
        }
    }

    return [null, -1] as const;
};

export interface ScrollToOptions {
    index: number;
    alignToTop?: boolean;
    offset?: number;
}

export interface ViewportListRef {
    scrollTo: (options: ScrollToOptions) => void;
    getScrollPosition: () => { index: number; offset: number };
}

export interface ViewportListProps {
    rootRef?: MutableRefObject<HTMLElement | null> | RefObject<HTMLElement | null>;
    children: (index: number) => any;
    length: number;
    height: number;
    axis?: 'y' | 'x';
    rootMargin?: string;
    prerender?: number;
    scrollTo?: ScrollToOptions;
    renderSpacer?: (props: { ref: MutableRefObject<any>; style: CSSProperties }) => any;
}

interface Indexes {
    start: number;
    end: number;
}

const ViewportListInner = (
    {
        rootRef,
        length,
        children,
        height,
        axis = 'y',
        rootMargin = '0px',
        prerender = 0,
        scrollTo,
        renderSpacer = ({ ref, style }) => <div ref={ref} style={style} />,
    }: ViewportListProps,
    ref: ForwardedRef<ViewportListRef>,
) => {
    const styleProperties = axis === 'y' ? STYLE_PROPERTIES_FOR_Y_AXIS : STYLE_PROPERTIES_FOR_X_AXIS;
    const maxIndex = length - 1;
    const initialIndex = scrollTo?.index || 0;
    const topSpacerRef = useRef<any>(null);
    const bottomSpacerRef = useRef<any>(null);
    const cacheRef = useRef<number[]>([]);
    const [indexes, setIndexes] = useState<Indexes>({ start: initialIndex - prerender, end: initialIndex + prerender });
    const marginTopRef = useRef(0);
    const anchorRef = useRef<{ element: Element; index: number } | null>(null);

    indexes.start = normalizeNumber(0, indexes.start, maxIndex);
    indexes.end = normalizeNumber(indexes.start, indexes.end, maxIndex);

    const { start, end } = indexes;
    const [scroll, setScroll] = useState(scrollTo);
    const getRootEventTarget = useCallback(() => (rootRef ? rootRef.current : window), [rootRef]);
    const getRoot = useCallback(() => (rootRef ? rootRef.current : document.documentElement), [rootRef]);
    const getRootBounds = useCallback((root: Element) => {
        if (root === document.documentElement) {
            return {
                top: 0,
                bottom: document.documentElement.clientHeight,
                height: document.documentElement.clientHeight,
                left: 0,
                right: document.documentElement.clientWidth,
                width: document.documentElement.clientWidth,
            };
        }

        return root.getBoundingClientRect();
    }, []);
    const resetMarginTop = useCallback(
        (force?: boolean) => {
            if (marginTopRef.current === 0) {
                return;
            }

            const root = getRoot();

            if (!root) {
                return;
            }

            const topSpacer = topSpacerRef.current;
            const topSpacerRect = topSpacer.getBoundingClientRect();
            const rootBounds = getRootBounds(root);

            if (
                force ||
                (marginTopRef.current < 0 &&
                    topSpacerRect[styleProperties.top] - marginTopRef.current >= rootBounds[styleProperties.top]) ||
                (marginTopRef.current > 0 && topSpacerRect[styleProperties.top] >= rootBounds[styleProperties.top])
            ) {
                const marginTop = marginTopRef.current;

                marginTopRef.current = 0;
                topSpacer.style[styleProperties.marginTop] = '0px';
                root.style[styleProperties.overflowY] = 'hidden';
                root[styleProperties.scrollTop] += -marginTop;
                root.style[styleProperties.overflowY] = '';
            }
        },
        [getRootBounds, getRoot, styleProperties],
    );
    const subtractMarginTop = useCallback(
        (value: number) => {
            if (!value) {
                return;
            }

            const topSpacer = topSpacerRef.current;

            marginTopRef.current -= value;
            topSpacer.style[styleProperties.marginTop] = `${marginTopRef.current}px`;
            resetMarginTop();
        },
        [resetMarginTop, styleProperties],
    );

    useLayoutEffect(() => {
        if (!scroll) {
            return;
        }

        const root = getRoot();

        if (!root) {
            return;
        }

        resetMarginTop(true);

        const topSpacer = topSpacerRef.current;
        const bottomSpacer = bottomSpacerRef.current;
        const topElement = topSpacer.nextSibling;
        const { index, offset = 0, alignToTop = true } = scroll;
        const normalizedIndex = normalizeNumber(start, index, end);
        const [element] = findElement({
            fromElement: topElement,
            toElement: bottomSpacer,
            fromIndex: start,
            compare: (_, index) => index === normalizedIndex,
        });

        if (!element) {
            return;
        }

        const elementRect = element.getBoundingClientRect();
        const rootBounds = getRootBounds(root);

        const shift = alignToTop
            ? elementRect[styleProperties.top] - rootBounds[styleProperties.top] + offset
            : elementRect[styleProperties.bottom] - rootBounds[styleProperties.bottom] + offset;

        root[styleProperties.scrollTop] += shift;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scroll]);

    const anchorHeightOnRender = (() => {
        const root = getRoot();
        const anchor = anchorRef.current;

        if (!root || !anchor) {
            return null;
        }

        const anchorElement = anchor.element;
        const anchorElementRect = anchorElement.getBoundingClientRect();
        const rootBounds = getRootBounds(root);

        return anchorElementRect[styleProperties.top] - rootBounds[styleProperties.top];
    })();

    useLayoutEffect(() => {
        const anchor = anchorRef.current;

        anchorRef.current = null;

        const root = getRoot();
        const topSpacer = topSpacerRef.current;
        const bottomSpacer = bottomSpacerRef.current;

        if (!root || !topSpacer || !bottomSpacer || !anchor || anchorHeightOnRender === null) {
            return;
        }

        const topElement = topSpacer.nextSibling;
        let top = null;

        if (anchor.index >= start && anchor.index <= end) {
            const [anchorElement] = findElement({
                fromElement: topElement,
                toElement: bottomSpacer,
                fromIndex: start,
                compare: (_, index) => index === anchor.index,
            });

            if (anchorElement) {
                top = anchorElement.getBoundingClientRect()[styleProperties.top];
            }
        } else {
            if (anchor.index < start) {
                top =
                    topSpacer.getBoundingClientRect()[styleProperties.top] +
                    cacheRef.current
                        .slice(0, anchor.index)
                        .reduce((sum, next) => sum + (next - height), anchor.index * height);
            } else if (anchor.index <= maxIndex) {
                top =
                    bottomSpacer.getBoundingClientRect()[styleProperties.top] +
                    cacheRef.current
                        .slice(start + 1, anchor.index)
                        .reduce((sum, next) => sum + (next - height), height * (anchor.index - 1 - start));
            }
        }

        if (top === null) {
            return;
        }

        const rootBounds = getRootBounds(root);
        const offset = top - rootBounds[styleProperties.top] - anchorHeightOnRender;

        if (!offset) {
            return;
        }

        subtractMarginTop(offset);
        //root[styleProperties.scrollTop] += offset;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [start]);
    useLayoutEffect(() => {
        const rootEventTarget = getRootEventTarget();

        if (!rootEventTarget) {
            return;
        }

        const handleScroll = () => resetMarginTop();

        rootEventTarget.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            rootEventTarget.removeEventListener('scroll', handleScroll);
        };
    }, [getRootEventTarget, resetMarginTop, styleProperties]);
    useLayoutEffect(() => {
        if (length < 2) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(({ rootBounds, boundingClientRect, target, isIntersecting }) => {
                    if (!rootBounds || !isIntersecting) {
                        return;
                    }

                    const next = { start, end };
                    const topSpacer = topSpacerRef.current;
                    const bottomSpacer = bottomSpacerRef.current;
                    const topElement = topSpacerRef.current.nextSibling;
                    const bottomElement = bottomSpacerRef.current.previousSibling;

                    if (target === topSpacer) {
                        const topSpaceToFill = Math.abs(
                            boundingClientRect[styleProperties.bottom] - rootBounds[styleProperties.top],
                        );
                        const startDiff = Math.ceil(topSpaceToFill / height);

                        next.start -= Math.max(startDiff, 1);

                        const bottomSecondElement = bottomElement.previousSibling;
                        const bottomSecondElementRect = bottomSecondElement.getBoundingClientRect();
                        const isBottomSecondElementBelowBottom =
                            bottomSecondElementRect[styleProperties.bottom] > rootBounds[styleProperties.bottom];

                        if (isBottomSecondElementBelowBottom) {
                            const [, index] = findElement({
                                fromElement: bottomElement,
                                toElement: topSpacer,
                                fromIndex: end,
                                asc: false,
                                compare: (element) => {
                                    const elementRect = element.getBoundingClientRect();
                                    const isElementAboveBottom =
                                        elementRect[styleProperties.bottom] <= rootBounds[styleProperties.bottom];

                                    return isElementAboveBottom;
                                },
                            });

                            if (index === -1) {
                                const bottomSpacerRect = bottomSpacer.getBoundingClientRect();
                                const bottomSpaceToShift = Math.abs(
                                    bottomSpacerRect[styleProperties.top] - rootBounds[styleProperties.bottom],
                                );
                                const endDiff = Math.ceil(bottomSpaceToShift / height);

                                next.end -= endDiff;
                            } else {
                                next.end = Math.min(index + 1, end);
                            }
                        }
                    }

                    if (target === bottomSpacer) {
                        const bottomSpaceToFill = Math.abs(
                            boundingClientRect[styleProperties.top] - rootBounds[styleProperties.bottom],
                        );
                        const endDiff = Math.ceil(bottomSpaceToFill / height);

                        next.end += Math.max(endDiff, 1);

                        const topSecondElement = topElement.nextSibling;
                        const topSecondElementRect = topSecondElement.getBoundingClientRect();
                        const isTopSecondElementAboveTop =
                            topSecondElementRect[styleProperties.top] < rootBounds[styleProperties.top];

                        if (isTopSecondElementAboveTop) {
                            const [, index] = findElement({
                                fromElement: topElement,
                                toElement: bottomSpacer,
                                fromIndex: start,
                                compare: (element) => {
                                    const elementRect = element.getBoundingClientRect();
                                    const isElementBelowTop =
                                        elementRect[styleProperties.top] >= rootBounds[styleProperties.top];

                                    return isElementBelowTop;
                                },
                            });

                            if (index === -1) {
                                const topSpaceToShift = Math.abs(
                                    topSpacer.getBoundingClientRect()[styleProperties.bottom] -
                                        rootBounds[styleProperties.top],
                                );
                                const startDiff = Math.ceil(topSpaceToShift / height);

                                next.start += startDiff;
                            } else {
                                next.start = Math.max(start, index - 1);
                            }
                        }
                    }

                    next.start = normalizeNumber(0, next.start, maxIndex);
                    next.end = normalizeNumber(next.start, next.end, maxIndex);

                    if (next.start !== start) {
                        if (start >= next.start) {
                            anchorRef.current = {
                                element: topElement,
                                index: start,
                            };
                        } else {
                            const [anchorElement, anchorElementIndex] = findElement({
                                fromElement: topElement,
                                toElement: bottomSpacer,
                                fromIndex: start,
                                compare: (element, index) => {
                                    if (index === next.start) {
                                        return true;
                                    }

                                    const elementRect = element.getBoundingClientRect();

                                    if (elementRect[styleProperties.height] !== height) {
                                        cacheRef.current[index] = elementRect[styleProperties.height];
                                    }

                                    return false;
                                },
                            });

                            if (anchorElement) {
                                anchorRef.current = {
                                    element: anchorElement,
                                    index: anchorElementIndex,
                                };
                            } else {
                                anchorRef.current = {
                                    element: bottomElement,
                                    index: end,
                                };
                            }
                        }
                    }

                    if (next.start !== start || next.end !== end) {
                        setIndexes(next);
                    }
                });
            },
            {
                root: rootRef?.current || null,
                rootMargin,
                threshold: 0,
            },
        );

        observer.observe(topSpacerRef.current);
        observer.observe(bottomSpacerRef.current);

        return () => {
            observer.disconnect();
        };
    });

    const scrollToMethod = useCallback(
        (options: ScrollToOptions) => {
            setIndexes((curr) => {
                if (options.index >= curr.start && options.index <= curr.end) {
                    return curr;
                }

                return { ...curr, start: options.index - prerender, end: options.index + prerender };
            });
            setScroll(options);
        },
        [prerender],
    );
    const getScrollPositionMethod = useCallback(() => ({ index: 0, offset: 0 }), []);

    useImperativeHandle(ref, () => ({ scrollTo: scrollToMethod, getScrollPosition: getScrollPositionMethod }), [
        getScrollPositionMethod,
        scrollToMethod,
    ]);

    if (!length) {
        return <Fragment />;
    }

    return (
        <Fragment>
            {renderSpacer({
                ref: topSpacerRef,
                style: getSpacerStyle({
                    styleProperties,
                    height: cacheRef.current
                        .slice(0, start)
                        .reduce((sum, next) => sum + (next - height), start * height),
                    marginTop: marginTopRef.current,
                }),
            })}
            {range(start, end + 1).map((_, index) => children(start + index))}
            {renderSpacer({
                ref: bottomSpacerRef,
                style: getSpacerStyle({
                    styleProperties,
                    height: cacheRef.current
                        .slice(end + 1, maxIndex + 1)
                        .reduce((sum, next) => sum + (next - height), height * (maxIndex - end)),
                }),
            })}
        </Fragment>
    );
};

export interface ViewportList {
    (props: ViewportListProps & { ref?: ForwardedRef<ViewportListRef> }): ReturnType<typeof ViewportListInner>;
}

export const ViewportList = forwardRef(ViewportListInner) as ViewportList;
