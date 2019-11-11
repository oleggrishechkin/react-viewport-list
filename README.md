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
<div className="list">
    {/*Some JSX*/}
    <ViewPortList
        listLength={items.length}
        itemMinHeight={ITEM_HEIGHT}
        margin={ITEM_MARGIN}
    >
        {({ innerRef, index, style }) => (
            <Item
                key={items[index].id}
                innerRef={innerRef}
                className="item"
                style={style}
                item={items[index]}
            />
        )} 
    </ViewPortList>
    {/*Some JSX*/}
</div>
```

## Props

name             |type                                |default|decription
-----------------|------------------------------------|-------|-----------
**listLength**   |number                              |0      |items count
**itemMinHeight**|number                              |1      |min item height in px
**margin**       |number                              |0      |margin between items in px
**children**     |({ innerRef, index, style }) => jsx`|null   |item render function
**scrollToIndex**|number                              |-1     |item index for scrollIntoView

*sorting by [react-sortable-hoc](https://github.com/clauderic/react-sortable-hoc) not supported now