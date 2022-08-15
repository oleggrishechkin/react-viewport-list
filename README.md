# React ViewPort List

[![NPM version](https://img.shields.io/npm/v/react-viewport-list.svg?style=flat)](https://www.npmjs.com/package/react-viewport-list)
![typescript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)
![NPM license](https://img.shields.io/npm/l/react-viewport-list.svg?style=flat)
[![NPM total downloads](https://img.shields.io/npm/dt/react-viewport-list.svg?style=flat)](https://npmcharts.com/compare/react-viewport-list?minimal=true)
[![NPM monthly downloads](https://img.shields.io/npm/dm/react-viewport-list.svg?style=flat)](https://npmcharts.com/compare/react-viewport-list?minimal=true)

> If your application renders long lists of data (hundreds or thousands of rows), we recommended using a technique known as “windowing”. This technique only renders a small subset of your rows at any given time, and can dramatically reduce the time it takes to re-render the components as well as the number of DOM nodes created.

\- [React.js documentation](https://reactjs.org/docs/optimizing-performance.html#virtualize-long-lists)

## 📜 Virtualization for lists with dynamic item size

## Features 🔥

-   Simple API like [**.map()**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map)
-   Created for **dynamic** item `height`/`width` (if you don't know item size)
-   Works perfectly with **Flexbox** (unlike other libraries with `pisition: absolute`)
-   Supports **scroll to index**
-   Supports **initial index**
-   Supports **vertical** ↕ and **horizontal** ↔ lists️️
-   Tiny (**<2kb** minified+gzipped)

Try 100k list [demo](https://codesandbox.io/s/react-viewport-list-xw2rt)

## Getting Started

-   ### Installation:

    ```shell script
    npm install --save react-viewport-list
    ```

-   ### Basic Usage:

    ```javascript
    import { useRef } from 'react';
    import ViewportList from 'react-viewport-list';

    const ItemsList = ({ items }) => {
        const ref = useRef(null);

        return (
            <div className="scroll-container" ref={ref}>
                <ViewportList viewportRef={ref} items={items} itemMinSize={40} margin={8}>
                    {(item) => (
                        <div key={item.id} className="item">
                            {item.title}
                        </div>
                    )}
                </ViewportList>
            </div>
        );
    };

    export default ItemsList;
    ```

## Props

| name                  | type                                                                 | default  | description                                                                                                                                                                                                    |
|-----------------------|----------------------------------------------------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **viewportRef**       | MutableRefObject<HTMLElement / null> / RefObject<HTMLElement / null> | required | Viewport `ref` object                                                                                                                                                                                          |
| **items**             | T[]                                                                  | []       | Array of items                                                                                                                                                                                                 |
| **itemMinSize**       | number                                                               | required | Item min height (or min width for 'x' **axis**) in px.<br>It should be grater than zero.<br>Setting it to to zero or lower than zero strongly not recommended - it will initially render all items in the list |
| **margin**            | number                                                               | 0        | Item margin bottom (or margin right for 'x' **axis**) in px.<br>You should still set `margin-bottom` (or `margin-right` for 'x' **axis**) in item styles                                                       |
| **overscan**          | number                                                               | 1        | Count of "overscan" items                                                                                                                                                                                      |
| **axis**              | 'y' / 'x'                                                            | 'y'      | Scroll axis<br>'y' - vertical, 'x' - horizontal                                                                                                                                                                |
| **initialIndex**      | number                                                               | -1       | Initial index of item in viewport                                                                                                                                                                              |
| **initialAlignToTop** | boolean / ScrollIntoViewOptions                                      | true     | [scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) second argument.<br>Used with **initialIndex**                                                                       |
| **initialOffset**     | number                                                               | 0        | Offset after scrollIntoView.<br>Used with **initialIndex**                                                                                                                                                     |
| **fixed**             | boolean                                                              | false    | Optimize case when item size is fixed                                                                                                                                                                          |
| **children**          | (item: T, index: number, array: T[]) => ReactNode                    | required | Item render function.<br>Similar to [`.map()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) callback                                                            |

## Methods

-   ### scrollToIndex

    **Params**

    | name           | type                            | default | description                                                                                               |
    | -------------- | ------------------------------- | ------- | --------------------------------------------------------------------------------------------------------- |
    | **index**      | number                          | -1      | Item index for scroll                                                                                     |
    | **alignToTop** | boolean / ScrollIntoViewOptions | true    | [scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) second argument |
    | **offset**     | number                          | 0       | Offset after scrollIntoView                                                                               |

    **Usage**

    ```javascript
    import { useRef } from 'react';
    import ViewportList from 'react-viewport-list';

    const ItemsList = ({ items }) => {
        const ref = useRef(null);
        const listRef = useRef(null);

        return (
            <div className="scroll-container" ref={ref}>
                <ViewportList ref={listRef} viewportRef={ref} items={items} itemMinSize={40} margin={8}>
                    {(item) => (
                        <div key={item.id} className="item">
                            {item.title}
                        </div>
                    )}
                </ViewportList>
                <button className="up-button" onClick={() => listRef.current.scrollToIndex(0)} />
            </div>
        );
    };

    export default ItemsList;
    ```

## Performance

If you have performance issues, you can add `will-change: transform` to a scroll container.

You should remember that in some situations `will-change: transform` can cause performance issues not fixed them.

```css
.scroll-container {
    will-change: transform;
}
```

## Limitations

-   ### margin

    You should use only `margin-bottom` (or `margin-right` for 'x' **axis**) for items, and provide it to **ViewportList** props. Don't use `margin-top` (or `margin-left` for 'x' **axis**)

    ```css
    .item {
        margin-bottom: 8px;
    }
    ```

## Advanced Usage

-   ### Grouping

    **ViewportList** render `Fragment` with items in viewport

    ```javascript
    import { useRef } from 'react';
    import ViewportList from 'react-viewport-list';

    const ItemsList = ({ keyItems, items }) => {
        const ref = useRef(null);

        return (
            <div className="scroll-container" ref={ref}>
                <span className="group-title">{'Key Items'}</span>
                <ViewportList viewportRef={ref} items={keyItems} itemMinSize={60} margin={8}>
                    {(item) => (
                        <div key={item.id} className="key-item">
                            {item.title}
                        </div>
                    )}
                </ViewportList>
                <span className="group-title">{'Items'}</span>
                <ViewportList viewportRef={ref} items={items} itemMinSize={40} margin={8}>
                    {(item) => (
                        <div key={item.id} className="item">
                            {item.title}
                        </div>
                    )}
                </ViewportList>
            </div>
        );
    };
    export default ItemsList;
    ```

-   ### Sorting

    You can use [React Sortable HOC](https://github.com/clauderic/react-sortable-hoc)

    ```javascript
    import { useRef } from 'react';
    import { SortableContainer, SortableElement } from 'react-sortable-hoc';
    import ViewportList from 'react-viewport-list';

    const SortableList = SortableContainer(({ innerRef, ...rest }) => <div {...rest} ref={innerRef} />);

    const SortableItem = SortableElement((props) => <div {...props} />);

    const ItemsList = ({ items, onSortEnd }) => {
        const ref = useRef(null);

        return (
            <SortableList innerRef={ref} className="scroll-container" onSortEnd={onSortEnd}>
                <ViewportList viewportRef={ref} items={items} itemMinSize={40} margin={8}>
                    {(item, index) => (
                        <SortableItem key={index} index={index} className="item">
                            {item.title}
                        </SortableItem>
                    )}
                </ViewportList>
            </SortableList>
        );
    };

    export default ItemsList;
    ```
