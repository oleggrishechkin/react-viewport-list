import { useRef } from 'react';

export const useScrollThreshold = ({ scrollThreshold }: { scrollThreshold: number }) => {
    const scrollTopRef = useRef<number | null>(null);
    const mainFrame = ({ viewport }: { viewport: any }) => {
        if (scrollTopRef.current === null) {
            scrollTopRef.current = viewport.scrollTop;
        } else if (scrollTopRef.current !== viewport.scrollTop) {
            const diff = Math.abs(viewport.scrollTop - scrollTopRef.current);

            scrollTopRef.current = viewport.scrollTop;

            if (scrollThreshold > 0 && diff > scrollThreshold) {
                return true;
            }
        }

        return false;
    };

    return [mainFrame] as const;
};
