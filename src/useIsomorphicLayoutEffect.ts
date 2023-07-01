import { useEffect, useLayoutEffect } from 'react';
import { IS_SSR } from './contants';

export const useIsomorphicLayoutEffect = IS_SSR ? useEffect : useLayoutEffect;
