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

name             |type                               |default                              |description
-----------------|-----------------------------------|-------------------------------------|----------------------------------------------------------------------------------------------------------------------------
**viewPortRef**  |object                             |{ current: document.documentElement }|View port ref object (usually is scroll container ref).<br>Set this prop is you want more accurate list virtualizing
**listLength**   |number                             |0                                    |List items count
**itemMinHeight**|number                             |1                                    |Item minimal height in px
**margin**       |number                             |0                                    |Margin between items in px
**overscan**     |number                             |0                                    |Extra rendered items count.<br>Set this prop if you want prerender more items.<br>Useful for lists with fixed item height
**scrollToIndex**|number                             |-1                                   |Scroll to item with specified index.<br>Item will be on top of scroll container
**children**     |({ innerRef, index, style }) => jsx|null                                 |Item render function

## Performance

For best performance you should add `will-change: transform` to container styles

In some situation you also can add `pointer-events: none` to parent container styles while scrolling

## Advanced
`ViewPortList` is not a list is a part of a list. It means you can virtualize some parts of scroll container

```javascript
<ScrollContainer>
    <ListTitle title="First" />
    <ViewPortList itemMinHeight={40} margin={8}>
        {({ innerRef, index, style }) => (
            <Item
                innerRef={innerRef}
                key={index}
                style={style}
                item={firstList[index].title}
            />
        )}
    </ViewPortList>
    <ListTitle title="Second" />
    <ViewPortList itemMinHeight={60} margin={16}>
        {({ innerRef, index, style }) => (
            <Item
                innerRef={innerRef}
                key={index}
                style={style}
                item={secondList[index].title}
            />
        )}
    </ViewPortList>
</ScrollContainer>
```

Remember that `ViewPortList` always render some items even list is not in view port.

## Sorting

Sorting by [react-sortable-hoc](https://github.com/clauderic/react-sortable-hoc) not supported now

You can fork this package and switch positioning by margins to positioning by padding (or absolute positioning) but all this methods needs additional dom node (items container)

## Best alternatives

- [react-virtualized](https://github.com/bvaughn/react-virtualized)
- [react-window](https://github.com/bvaughn/react-window)