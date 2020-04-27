## React ViewPort List
[![NPM version](https://img.shields.io/npm/v/react-viewport-list.svg?style=flat)](https://www.npmjs.com/package/react-viewport-list)
![NPM license](https://img.shields.io/npm/l/react-viewport-list.svg?style=flat)
[![NPM total downloads](https://img.shields.io/npm/dt/react-viewport-list.svg?style=flat)](https://npmcharts.com/compare/react-viewport-list?minimal=true)
[![NPM monthly downloads](https://img.shields.io/npm/dm/react-viewport-list.svg?style=flat)](https://npmcharts.com/compare/react-viewport-list?minimal=true)

### Virtual List for items with dynamic height

- Simple API like `.map()` (no item `ref`/`style` no list `width`/`height` required)
- Works perfectly with _Flexbox_ and _Grid_ (no `pisition: absolute`)
- Supports scroll to index
- Lightweight (1.5kb minified+gzipped)

Try 100k list [demo](https://oleggrishechkin.github.io/react-viewport-list)

## Getting Started

#### Installation:

```shell script
npm install --save react-viewport-list
```

#### Basic Usage:

```javascript
import React from 'react';
import ViewPortList from 'react-viewport-list';
 
const ItemsList = ({ items }) => (
    <div className="scroll-container">
        <ViewPortList items={items} itemMinHeight={40} marginBottom={8}>
            {(items) => (
                <div key={items.id} className="item">
                    {items.title}
                </div>
            )}
        </ViewPortList>
    </div>
);

export default ItemsList;
```

## Props

name                 |type                |default |description
---------------------|--------------------|--------|---------------------------------------------------------------------------------------------------------------------------------
**viewPortRef**      |object              |null    |View port ref object.<br>Scroll container ref is required for browsers which unsupported `overflow-anchor` css property
**items**            |array               |[]      |List of items
**itemMinHeight**    |number              |required|Item minimal height in px
**marginBottom**     |number              |0       |Item marginBottom in px.<br>You should still set `margin-bottom` or `marginBottom` in item styles
**overscan**         |number              |1       |Overscan items with minimal height count
**initialIndex**     |number              |-1      |Item index for scroll
**initialAlignToTop**|bool                |true    |[scrollIntoView](https://developer.mozilla.org/ru/docs/Web/API/Element/scrollIntoView) argument
**children**         |(item, index) => jsx|required|Item render function.<br>Similar to `.map()` callback

## Methods

### scrollToIndex

Params

name          |type          |default|description
--------------|--------------|-------|-----------------------------------------------------------------------------------------------
**index**     |number        |-1     |Item index for scroll
**alignToTop**|bool or object|true   |[scrollIntoView](https://developer.mozilla.org/ru/docs/Web/API/Element/scrollIntoView) argument

Usage

```javascript
import React, { useRef } from 'react';
import ViewPortList from 'react-viewport-list';
 
const ItemsList = ({ items }) => {
    const listRef = useRef(null);

    return (
        <div className="scroll-container">
            <ViewPortList
                ref={listRef}
                items={items}
                itemMinHeight={40}
                marginBottom={8}
            >
                {(item) => (
                    <div key={item.id} className="item">
                        {item.title}
                    </div>
                )}
            </ViewPortList>
            <button className="up-button" onClick={() => listRef.current.scrollToIndex(0)} />
        </div>
    );
};

export default ItemsList;
```

## Performance

You should add `will-change: transform` to container styles for better performance

```css
.scroll-container {
    will-change: transform;
}
```

## Limitations

- ### `overflow-anchor`

    If you are using `overflor-anchor` css property for container or items, scroll may lagging (jumping). Don't use this property.
    
    Fast scrolling up impossible (if items not cached yet) for browsers which unsupported `overflow-anchor` css property because list sets scrollTop to prevent scroll lagging (jumping)

- ### `margin`

    You should use only `margin-bottom` for items, and provide it to **ViewPortList** props. Don't use `margin-top`
 
    ```css
    .item {
        margin-bottom: 8px;
    }    
    ```

- ### `css child selectors`

    Be accurate with css child selectors (and pseudo-classes) for items styling. **ViewPortList** adds blank `div`'s on list top and bottom

## Advanced Usage

### Grouping

**ViewPortList** is only items (without container)

```javascript
import React from 'react';
import ViewPortList from 'react-viewport-list';

const ItemsList = ({ keyItems, items }) => (
    <div className="scroll-container">
        <span className="group-title">{'Key Items'}</span>
        <ViewPortList items={keyItems} itemMinHeight={60} marginBottom={8}>
            {(item) => (
                <div key={item.id} className="key-item">
                    {item.title}
                </div>
            )}
        </ViewPortList>
        <span className="group-title">{'Items'}</span>
        <ViewPortList items={items} itemMinHeight={40} marginBottom={8}>
            {(item) => (
                <div key={item.id} className="item">
                    {item.title}
                </div>
            )}
        </ViewPortList>
    </div>
);

export default ItemsList;
```

### Sorting

You can use _[React Sortable HOC](https://github.com/clauderic/react-sortable-hoc)_

```javascript
import React, { useRef } from 'react';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import ViewPortList from 'react-viewport-list';

const SortableItem = SortableElement((props) => <div {...props} />);

const SortableList = SortableContainer((props) => <div {...props} />);
 
const ItemsList = ({ items, onSortEnd }) => (
    <SortableList className="scroll-container" onSortEnd={onSortEnd}>
        <ViewPortList items={items} itemMinHeight={40} marginBottom={8}>
            {(item, index) => (
                <SortableItem key={index} index={index} className="item">
                    {item.title}
                </SortableItem>
            )}
        </ViewPortList>
    </SortableList>
);

export default ItemsList;
```
## Alternatives

- [react-window](https://github.com/bvaughn/react-window)
- [react-virtualized](https://github.com/bvaughn/react-virtualized)