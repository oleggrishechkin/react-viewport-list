import { generateArray } from './utils';

export const useRenderItems = <T>({
    items = [],
    count,
    children,
    startIndex,
    endIndex,
    withCount,
}: {
    items?: T[];
    count?: number;
    children: (...args: any) => any;
    startIndex: number;
    endIndex: number;
    withCount: boolean;
}) => {
    return (
        (!!count || !!items.length) &&
        generateArray(startIndex, endIndex + 1, withCount ? children : (index) => children(items[index], index, items))
    );
};
