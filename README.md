## React ViewPort List
[![NPM version](https://img.shields.io/npm/v/react-viewport-list.svg?style=flat)](https://www.npmjs.com/package/react-viewport-list)
![NPM license](https://img.shields.io/npm/l/react-viewport-list.svg?style=flat)
[![NPM total downloads](https://img.shields.io/npm/dt/react-viewport-list.svg?style=flat)](https://npmcharts.com/compare/react-viewport-list?minimal=true)
[![NPM monthly downloads](https://img.shields.io/npm/dm/react-viewport-list.svg?style=flat)](https://npmcharts.com/compare/react-viewport-list?minimal=true)

See 100k list [demo](https://oleggrishechkin.github.io/react-viewport-list) with random item height

### Delicious virtual list with zero dependencies

- Dynamic item height (only min height required)
- No absolute position (used margin instead)
- No list width/height required
- Support scroll to index
- No extra DOM nodes
- No cache required
- Fast (60 fps)
- Lightweight

## Getting Started

### Installation:

```shell script
npm install --save react-viewport-list
```

### Basic Usage:

```javascript
import React from 'react';
import ViewPortList from 'react-viewport-list';
 
const ItemsList = ({ items }) => (
    <div className="scroll-container">
        <ViewPortList
            listLength={items.length}
            itemMinHeight={40}
            margin={8}
        >
            {({ innerRef, index, style }) => (
                <div
                    ref={innerRef}
                    key={item[index].id}
                    className="item"
                    style={style}
                >
                    {items[index].title}
                </div>
            )}
        </ViewPortList>
    </div>
);

export default ItemsList;
```

## Props

name             |type                               |default                              |description
-----------------|-----------------------------------|-------------------------------------|---------------------------------------------------------------------------------------------------------------------------------
**viewPortRef**  |object                             |{ current: document.documentElement }|View port ref object (usually is scroll container ref).<br>Set this prop is you want more accurate virtualizing
**listLength**   |number                             |0                                    |List items count
**itemMinHeight**|number                             |1                                    |Item minimal height in px
**margin**       |number                             |0                                    |Margin between items in px
**limit**        |number                             |0                                    |Extra rendered px on top and bottom.<br>Set this prop if you want increase virtualizing area<br>It can fix black screen on scroll
**children**     |({ innerRef, index, style }) => jsx|null                                 |Item render function

## Methods

### scrollToIndex

Params

name     |type  |default|description
---------|------|-------|-----------------------------------------------------------------------------------------------
**index**|number|-1     |item index for scroll
**toTop**|bool  |0      |[scrollIntoView](https://developer.mozilla.org/ru/docs/Web/API/Element/scrollIntoView) argument

## Performance

For better performance you should add `will-change: transform` to container styles

## Advanced Usage

#### Grouping

```javascript
<div className="scroll-container">
        <span className="group-title">{'Key Items'}</span>
        <ViewPortList
            listLength={keyItems.length}
            itemMinHeight={60}
            margin={8}
        >
            {({ innerRef, index, style }) => (
                <div
                    ref={innerRef}
                    key={keyItems[index].id}
                    className="key-item"
                    style={style}
                >
                    {keyItems[index].title}
                </div>
            )}
        </ViewPortList>
        <span className="group-title">{'Items'}</span>
        <ViewPortList
            listLength={items.length}
            itemMinHeight={40}
            margin={8}
        >
            {({ innerRef, index, style }) => (
                <div
                    ref={innerRef}
                    key={item[index].id}
                    className="item"
                    style={style}
                >
                    {items[index].title}
                </div>
            )}
        </ViewPortList>
    </div>
```

#### Setting `viewPortRef`

```javascript
import React, { useRef } from 'react';
import ViewPortList from 'react-viewport-list';
 
const ItemsList = ({ items }) => {
    const viewPortRef = useRef(null);

    return (
        <div ref={viewPortRef} className="scroll-container">
            <ViewPortList
                viewPortRef={viewPortRef}
                listLength={items.length}
                itemMinHeight={40}
                margin={8}
            >
                {({ innerRef, index, style }) => (
                    <div
                        ref={innerRef}
                        key={item[index].id}
                        className="item"
                        style={style}
                    >
                        {items[index].title}
                    </div>
                )}
            </ViewPortList>
        </div>
    );
};

export default ItemsList;
```

#### Setting `overscan`

```javascript
<div className="scroll-container">
    <ViewPortList
        listLength={items.length}
        itemMinHeight={40}
        margin={8}
        overscan={200}
    >
        {({ innerRef, index, style }) => (
            <div
                ref={innerRef}
                key={item[index].id}
                className="item"
                style={style}
            >
                {items[index].title}
            </div>
        )}
    </ViewPortList>
</div>
```

#### Using `scrollToIndex`

```javascript
import React, { useState } from 'react';
import ViewPortList from 'react-viewport-list';
 
const ItemsList = ({ items }) => {
    const listRef = useRef(null);

    return (
        <div ref={viewPortRef} className="scroll-container">
            <ViewPortList
                ref={listRef}
                viewPortRef={viewPortRef}
                listLength={items.length}
                itemMinHeight={40}
                margin={8}
            >
                {({ innerRef, index, style }) => (
                    <div
                        ref={innerRef}
                        key={item[index].id}
                        className="item"
                        style={style}
                    >
                        {items[index].title}
                    </div>
                )}
            </ViewPortList>
            <button className="up-button" onClick={() => {
                listRef.current.scrollToIndex(0);
            }} />
        </div>
    );
};

export default ItemsList;
```

## Sorting

Sorting by [react-sortable-hoc](https://github.com/clauderic/react-sortable-hoc) not supported now

## Best alternatives

- [react-virtualized](https://github.com/bvaughn/react-virtualized)
- [react-window](https://github.com/bvaughn/react-window)