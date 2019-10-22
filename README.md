## React ViewPort List
[![NPM version](https://img.shields.io/npm/v/react-viewport-list.svg?style=flat)](https://www.npmjs.com/package/react-viewport-list)
![NPM license](https://img.shields.io/npm/l/react-viewport-list.svg?style=flat)
[![NPM total downloads](https://img.shields.io/npm/dt/react-viewport-list.svg?style=flat)](https://npmcharts.com/compare/react-viewport-list?minimal=true)
[![NPM monthly downloads](https://img.shields.io/npm/dm/react-viewport-list.svg?style=flat)](https://npmcharts.com/compare/react-viewport-list?minimal=true)

[Demo](https://oleggrishechkin.github.io/react-viewport-list)

Virtual list without extra DOM nodes and absolute positioning.
Use this package if list is a part of some view port (scrollable container).

**Warning!**

Works only for vertical lists with fixed items height, sorting not supported.
You can use best alternatives for lists with variable items height and sorting like [react-virualized](https://github.com/bvaughn/react-virtualized).

## Getting Started

### Install:

```shell script
npm install --save react-viewport-list
```

### Import:

```javascript
import ViewPortList from 'react-viewport-list';
```

### Use:

```javascript
<div ref={viewPortRef}>
    {/*Some JSX*/}
    <ViewPortList
        viewPortRef={viewPortRef}
        elementsCount={items.length}
        elementHeight={ITEM_HEIGHT}
        margin={ITEM_MARGIN}
    >
        {({ innerRef, index, style }) => (
            <Item
                innerRef={innerRef}
                key={items[index].id}
                style={style}
                item={items[index]}
            />
        )} 
    </ViewPortList>
    {/*Some JSX*/}
</div>
```

## Props

### `viewPortRef: object`

`ref`-object with view port (scrollable container) node in `current` props.

### `elementsCount: number`

list items count, `0` by default.

### `elementHeight: number`

list item height in px, `0` by default.

### `margin: number`

margin between items in px, `0` by default.

### `children: ({ innerRef, index, style }) => jsx`

function  for rendering item with `props` param.
