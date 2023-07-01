import { useRef } from 'react';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

export const useAnimationFrame = (func: (frameId: number) => any) => {
    const funcRef = useRef(func);

    useIsomorphicLayoutEffect(() => {
        funcRef.current = func;
    }, [func]);
    useIsomorphicLayoutEffect(() => {
        let frameId: number;
        const frame = () => {
            frameId = requestAnimationFrame(frame);
            funcRef.current(frameId);
        };

        frame();

        return () => {
            cancelAnimationFrame(frameId);
        };
    }, []);
};
