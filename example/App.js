import React, { useRef } from 'react';
import ViewPortList from '../src';
import theme from './App.module.css';

const App = () => {
    const ref = useRef(null);

    return (
        <div className={theme.app}>
            <header className={theme.header}>
                <h1>{'React ViewPort List'}</h1>
            </header>
            <main className={theme.main}>
                <ul ref={ref} className={theme.list}>
                    <ViewPortList viewPortRef={ref} elementsCount={100} elementHeight={40} margin={8}>
                        {({ innerRef, index, style }) => (
                            <li ref={innerRef} key={index} style={style} className={theme.item}>
                                {`Item ${index}`}
                            </li>
                        )}
                    </ViewPortList>
                </ul>
            </main>
        </div>
    );
};

export default App;
