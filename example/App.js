import React, { useMemo, useRef, useEffect, useState } from 'react';
import { loremIpsum } from 'lorem-ipsum';
import ViewPortList from '../src';
import theme from './App.module.css';

const App = () => {
    const [scrollIndex, setScrollIndex] = useState(-1);
    const items = useMemo(
        () =>
            new Array(100000).fill(null).map(() => ({
                title: loremIpsum({ units: 'paragraph', paragraphLowerBound: 1, paragraphUpperBound: 10 })
            })),
        []
    );
    const ref = useRef(null);

    useEffect(() => {
        window.scrollToIndex = (index) => setScrollIndex(index);
    }, []);

    return (
        <div className={theme.app}>
            <header className={theme.header}>
                <h1>{'React ViewPort List'}</h1>
            </header>
            <main className={theme.main}>
                <ul className={theme.list} ref={ref}>
                    <ViewPortList
                        viewPortRef={ref}
                        listLength={items.length}
                        itemMinHeight={40}
                        margin={8}
                        scrollToIndex={scrollIndex}
                    >
                        {({ innerRef, index, style }) => (
                            <li ref={innerRef} key={index} style={style} className={theme.item}>
                                {`${index + 1} Item ${items[index].title}`}
                            </li>
                        )}
                    </ViewPortList>
                </ul>
            </main>
        </div>
    );
};

export default App;
