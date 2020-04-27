import React, { useState, useRef, useEffect } from 'react';
import { loremIpsum } from 'lorem-ipsum';
import ViewPortList from '../src';
import './App.css';

const App = () => {
    const ref = useRef(null);
    const listRef = useRef(null);
    const [items] = useState(() => {
        const result = [];

        for (let i = 0; i < 100000; ++i) {
            result.push({
                title: loremIpsum({ units: 'paragraph', paragraphLowerBound: 1, paragraphUpperBound: 10 })
            });
        }

        return result;
    });

    useEffect(() => {
        window.scrollToIndex = (index, alignToTop) => listRef.current.scrollToIndex(index, alignToTop);
    }, []);

    return (
        <div className="app">
            <header className="header">
                <a
                    className="link"
                    href="https://github.com/oleggrishechkin/react-viewport-list"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {'React ViewPort List'}
                </a>
            </header>
            <main className="main" ref={ref}>
                <div className="list">
                    <ViewPortList ref={listRef} viewPortRef={ref} items={items} itemMinHeight={68} marginBottom={16}>
                        {(item, index) => (
                            <div key={index} className={`item${index % 2 === 0 ? '' : ' odd'}`}>
                                {`${index + 1} Item\n${item.title}`}
                            </div>
                        )}
                    </ViewPortList>
                </div>
            </main>
        </div>
    );
};

export default App;
