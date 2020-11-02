# React ViewPort List

[![NPM version](https://img.shields.io/npm/v/react-viewport-list.svg?style=flat)](https://www.npmjs.com/package/react-viewport-list)
![NPM license](https://img.shields.io/npm/l/react-viewport-list.svg?style=flat)
[![NPM total downloads](https://img.shields.io/npm/dt/react-viewport-list.svg?style=flat)](https://npmcharts.com/compare/react-viewport-list?minimal=true)
[![NPM monthly downloads](https://img.shields.io/npm/dm/react-viewport-list.svg?style=flat)](https://npmcharts.com/compare/react-viewport-list?minimal=true)

>If your application renders long lists of data (hundreds or thousands of rows), we recommended using a technique known as “windowing”. This technique only renders a small subset of your rows at any given time, and can dramatically reduce the time it takes to re-render the components as well as the number of DOM nodes created. 
 
\- [React.js documentation](https://reactjs.org/docs/optimizing-performance.html#virtualize-long-lists)

## Virtual List for items with dynamic height/width

- Simple API like [`.map()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) (no item `ref`/`style` or list `width`/`height` required)
- Dynamic `height`/`width`
- Works perfectly with _Flexbox_ (no `pisition: absolute`)
- Scroll to index
- Vertical and Horizontal lists
- Lightweight (1.5kb minified+gzipped)

Try 100k list [demo](https://oleggrishechkin.github.io/react-viewport-list)

## Getting Started

- ### Installation:

    ```shell script
    npm install --save react-viewport-list
    ```

- ### Basic Usage:

    ```javascript
    import React from 'react';
    import ViewportList from 'react-viewport-list';
     
    const ItemsList = ({ items }) => (
        <div className="scroll-container">
            <ViewportList items={items} itemMinSize={40} margin={8}>
                {(items) => (
                    <div key={items.id} className="item">
                        {items.title}
                    </div>
                )}
            </ViewportList>
        </div>
    );
    
    export default ItemsList;
    ```

## Props

name                 |type                |default |description
---------------------|--------------------|--------|---------------------------------------------------------------------------------------------------------------------------------
**viewportRef**      |object              |null    |Viewport `ref` object.<br>Required for browsers which unsupported `overflow-anchor` css property (like _Safari_)
**items**            |array               |[]      |Array of items
**itemMinSize**      |number              |required|Item min height (or min width for _x_ **axis**) in px
**margin**           |number              |0       |Item margin bottom (or margin right for _x_ **axis**) in px.<br>You should still set `margin-bottom` (or `margin-right` for _x_ **axis**) in item styles
**overscan**         |number              |1       |Count of "overscan" items
**axis**             |_y_ or _x_          |_y_     |Scroll axis<br>_y_ - vertical, _x_ - horizontal
**initialIndex**     |number              |-1      |Initial index of item in viewport
**initialAlignToTop**|bool                |true    |[scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) second argument.<br>Used with **initialIndex**)
**children**         |(item, index) => jsx|required|Item render function.<br>Similar to [`.map()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) callback

## Methods

- ### scrollToIndex

    **Params**
    
    name          |type          |default|description
    --------------|--------------|-------|-----------------------------------------------------------------------------------------------
    **index**     |number        |-1     |Item index for scroll
    **alignToTop**|bool or object|true   |[scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) second argument
    
    **Usage**
    
    ```javascript
    import React, { useRef } from 'react';
    import ViewportList from 'react-viewport-list';
     
    const ItemsList = ({ items }) => {
        const listRef = useRef(null);
    
        return (
            <div className="scroll-container">
                <ViewportList
                    ref={listRef}
                    items={items}
                    itemMinSize={40}
                    margin={8}
                >
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

You should add `will-change: transform` to a container styles for better performance

```css
.scroll-container {
    will-change: transform;
}
```

## Limitations

- ### overflow-anchor

    If you are using `overflor-anchor` css property for a container or items, scroll may lagging (jumping). Don't use this property.
    
    Fast scrolling up impossible (if items not cached yet) for browsers which unsupported `overflow-anchor` css property (like _Safari_) because list sets scrollTop to prevent scroll lagging (jumping)

- ### margin

    You should use only `margin-bottom` (or `margin-right` for _x_ **axis**)for items, and provide it to **ViewportList** props. Don't use `margin-top` (or `margin-left` for _x_ **axis**)
 
    ```css
    .item {
        margin-bottom: 8px;
    }    
    ```

- ### css child selectors

    Be accurate with css child selectors (and pseudo-classes) for items styling. **ViewportList** adds blank `div`'s on list top and bottom

## Advanced Usage

- ### Grouping

    **ViewportList** is only items (without a container)
    
    ```javascript
    import React from 'react';
    import ViewportList from 'react-viewport-list';
    
    const ItemsList = ({ keyItems, items }) => (
        <div className="scroll-container">
            <span className="group-title">{'Key Items'}</span>
            <ViewportList items={keyItems} itemMinSize={60} margin={8}>
                {(item) => (
                    <div key={item.id} className="key-item">
                        {item.title}
                    </div>
                )}
            </ViewportList>
            <span className="group-title">{'Items'}</span>
            <ViewportList items={items} itemMinSize={40} margin={8}>
                {(item) => (
                    <div key={item.id} className="item">
                        {item.title}
                    </div>
                )}
            </ViewportList>
        </div>
    );
    
    export default ItemsList;
    ```

- ### Sorting

    You can use _[React Sortable HOC](https://github.com/clauderic/react-sortable-hoc)_
    
    ```javascript
    import React, { useRef } from 'react';
    import { SortableContainer, SortableElement } from 'react-sortable-hoc';
    import ViewportList from 'react-viewport-list';
    
    const SortableItem = SortableElement((props) => <div {...props} />);
    
    const SortableList = SortableContainer((props) => <div {...props} />);
     
    const ItemsList = ({ items, onSortEnd }) => (
        <SortableList className="scroll-container" onSortEnd={onSortEnd}>
            <ViewportList items={items} itemMinSize={40} margin={8}>
                {(item, index) => (
                    <SortableItem key={index} index={index} className="item">
                        {item.title}
                    </SortableItem>
                )}
            </ViewportList>
        </SortableList>
    );
    
    export default ItemsList;
    ```
  