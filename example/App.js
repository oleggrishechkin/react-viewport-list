import React, { useMemo, useRef, useEffect } from 'react';
import { loremIpsum } from 'lorem-ipsum';
import ViewPortList from '../src';
import theme from './App.module.css';

const App = () => {
    const ref = useRef(null);
    const listRef = useRef(null);
    const items = useMemo(
        () =>
            new Array(100000).fill(null).map(() => ({
                title: loremIpsum({ units: 'paragraph', paragraphLowerBound: 1, paragraphUpperBound: 10 })
            })),
        []
    );

    useEffect(() => {
        window.scrollToIndex = (index, toTop) => listRef.current.scrollToIndex(index, toTop);
    }, []);

    return (
        <div className={theme.app}>
            <header className={theme.header}>
                <h1>{'React ViewPort List'}</h1>
            </header>
            <main className={theme.main}>
                <ul className={theme.list} ref={ref}>
                    <ViewPortList
                        ref={listRef}
                        viewPortRef={ref}
                        listLength={items.length}
                        itemMinHeight={40}
                        margin={8}
                        overscan={200}
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
