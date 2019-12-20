## React ViewPort List
[![NPM version](https://img.shields.io/npm/v/react-viewport-list.svg?style=flat)](https://www.npmjs.com/package/react-viewport-list)
![NPM license](https://img.shields.io/npm/l/react-viewport-list.svg?style=flat)
[![NPM total downloads](https://img.shields.io/npm/dt/react-viewport-list.svg?style=flat)](https://npmcharts.com/compare/react-viewport-list?minimal=true)
[![NPM monthly downloads](https://img.shields.io/npm/dm/react-viewport-list.svg?style=flat)](https://npmcharts.com/compare/react-viewport-list?minimal=true)

See 100k list [demo](https://oleggrishechkin.github.io/react-viewport-list)

### Delicious virtual list with zero dependencies

- Dynamic item height (only min height required)
- No absolute position (used margin instead)
- No list width/height required
- Support scroll to index
- No extra DOM nodes
- Fast (60 fps)
- Lightweight
- No cache

## Getting Started

### Installation:

```shell script
npm install --save react-viewport-list
```

### Importing:

```javascript
import ViewPortList from 'react-viewport-list';
```

### Usage:

```javascript
<ul>
    <ViewPortList itemMinHeight={40} margin={8}>
        {({ innerRef, index, style }) => (
            <li ref={innerRef} key={index} style={style}>
                {items[index].title}
            </li>
        )}
    </ViewPortList>
</ul>
```

## Props

name             |type                               |default|description
-----------------|-----------------------------------|-------|-----------
**listLength**   |number                             |0      |items count
**itemMinHeight**|number                             |1      |min item height in px
**margin**       |number                             |0      |margin between items in px
**fixed**        |bool                               |false  |all items has equal fixed height
**overscan**     |number                             |10     |extra items on top and bottom
**children**     |({ innerRef, index, style }) => jsx|null   |item render function
**scrollToIndex**|number                             |-1     |item index for scrollIntoView

## Performance

For best performance you should add `will-change: transform` to container styles

In some situation you also can add `pointer-events: none` to parent container styles while scrolling

## Sorting

Sorting by [react-sortable-hoc](https://github.com/clauderic/react-sortable-hoc) not supported now

You can fork this package and switch positioning by margins to positioning by padding (or absolute positioning) but all this methods needs additional dom node (items container)

## Best alternatives

- [react-virtualized](https://github.com/bvaughn/react-virtualized)
- [react-window](https://github.com/bvaughn/react-window)