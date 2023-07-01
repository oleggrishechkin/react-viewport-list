import { PROP_NAME_FOR_X_AXIS, PROP_NAME_FOR_Y_AXIS, SCROLLABLE_REGEXP } from './contants';

export const normalizeValue = (min: number, value: number, max = Infinity) => Math.max(Math.min(value, max), min);

export const getDiff = (value1: number, value2: number, step: number) => Math.ceil(Math.abs(value1 - value2) / step);

export const generateArray = <T>(from: number, to: number, generate: (index: number) => T): T[] => {
    const array = [];

    for (let index = from; index < to; index++) {
        array.push(generate(index));
    }

    return array;
};

export const findElement = ({
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

export const getStyle = (
    propName: typeof PROP_NAME_FOR_Y_AXIS | typeof PROP_NAME_FOR_X_AXIS,
    size: number,
    marginTop = 0,
) =>
    ({
        padding: 0,
        margin: 0,
        border: 'none',
        visibility: 'hidden',
        overflowAnchor: 'none',
        [propName.minHeight]: size,
        [propName.height]: size,
        [propName.maxHeight]: size,
        [propName.marginTop]: marginTop,
    } as const);

export const findNearestScrollableElement = (node: Element | null, axis: 'y' | 'x' = 'y'): Element | null => {
    if (!node || node === document.body || node === document.documentElement) {
        return document.documentElement;
    }

    const style = window.getComputedStyle(node);

    if (
        SCROLLABLE_REGEXP.test(style[axis === 'y' ? 'overflowY' : 'overflowX']) ||
        SCROLLABLE_REGEXP.test(style.overflow)
    ) {
        return node;
    }

    return findNearestScrollableElement(node.parentNode as Element | null, axis);
};
