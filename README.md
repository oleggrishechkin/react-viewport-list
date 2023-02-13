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

- Simple API like [**Array.Prototype.map()**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map)
- Created for **dynamic** item `height` or `width` (if you don't know item size)
- Works perfectly with **Flexbox** (unlike other libraries with `position: absolute`)
- Supports **scroll to index**
- Supports **initial index**
- Supports **vertical** ↕ and **horizontal** ↔ lists️️
- Tiny (about **2kb** minified+gzipped)

Try 100k list [demo](https://codesandbox.io/s/react-viewport-list-xw2rt)

## Getting Started

- ### Installation:

  ```shell script
  npm install --save react-viewport-list
  ```

- ### Basic Usage:

  ```typescript jsx
  import { useRef } from 'react';
  import { ViewportList } from 'react-viewport-list';

  const ItemList = ({
    items,
  }: {
    items: { id: string; title: string }[];
  }) => {
    const ref = useRef<HTMLDivElement | null>(
      null,
    );

    return (
      <div className="scroll-container" ref={ref}>
        <ViewportList
          viewportRef={ref}
          items={items}
        >
          {(item) => (
            <div key={item.id} className="item">
              {item.title}
            </div>
          )}
        </ViewportList>
      </div>
    );
  };

  export { ItemList };
  ```

MutableRefObject\<HTMLElement / null\> / RefObject\<HTMLElement / null\> / { current: HTMLElement / null } / null
## Props

| name                                | type                                                                                                                              | default                                               | description                                                                                                                                                                                                                                                 |
|-------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `viewportRef`                       | MutableRefObject\<HTMLElement / null\> / RefObject\<HTMLElement / null\> / { current: HTMLElement / null } / null                 | required                                              | Viewport and scroll container.<br>`document.documentElement` will be used if `viewportRef` not provided.                                                                                                                                                    |
| `items`                             | T[]                                                                                                                               | []                                                    | Array of items.                                                                                                                                                                                                                                             |
| `itemSize`                          | number                                                                                                                            | 0                                                     | Item average (estimated) size (`height` for `axis="y"` and `width` for `axis="x"`) in px.<br>Size should be greater or equal zero.<br>Size will be computed automatically if `itemMinSize` not provided or equal zero.                                      |
| `itemMargin`                        | number                                                                                                                            | -1                                                    | Item margin (`margin-bottom` for `axis="y"` and `margin-right` for `axis="x"`) in px.<br>Margin should be greater or equal -1.<br>Margin will be computed automatically if `margin` not provided or equal -1.<br>You should still set margin in item styles |
| `overscan`                          | number                                                                                                                            | 1                                                     | Count of "overscan" items.                                                                                                                                                                                                                                  |
| `axis`                              | "y" / "x"                                                                                                                         | 'y'                                                   | Scroll axis:<ul><li>"y" - vertical</li><li>"x" - horizontal</li></ul>                                                                                                                                                                                       |
| `initialIndex`                      | number                                                                                                                            | -1                                                    | Initial item index in viewport.                                                                                                                                                                                                                             |
| `initialAlignToTop`                 | boolean                                                                                                                           | true                                                  | [scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) param.<br>Used with `initialIndex`                                                                                                                                |
| `initialOffset`                     | number                                                                                                                            | 0                                                     | Offset after `scrollIntoView` call.<br>Used with `initialIndex`.<br>This value will be added to the scroll after scroll to index.                                                                                                                           |
| `initialDelay`                      | number                                                                                                                            | -1                                                    | `setTimeout` delay for initial `scrollToIndex`.<br>Used with `initialIndex`.                                                                                                                                                                                |
| `initialPrerender`                  | number                                                                                                                            | 0                                                     | Used with `initialIndex`.<br>This value will modify initial start index and initial end index like `[initialIndex - initialPrerender, initialIndex + initialPrerender]`.<br>You can use it to avoid blank screen with only one initial item rendered        |
| `children`                          | (item: T, index: number, array: T[]) => ReactNode                                                                                 | required                                              | Item render function.<br>Similar to [`Array.Prototype.map()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map).                                                                                                  |
| `onViewportIndexesChange`           | (viewportIndexes: [number, number]) => void                                                                                       | optional                                              | Will be called on rendered in viewport indexes change.                                                                                                                                                                                                      |
| `overflowAnchor`                    | "none" / "auto"                                                                                                                   | "auto"                                                | Compatibility for `overflow-anchor: none`.<br>Set it to "none" if you use `overflow-anchor: none` in your parent container styles.                                                                                                                          |
| `withCache`                         | boolean                                                                                                                           | true                                                  | Cache rendered item heights.                                                                                                                                                                                                                                |
| `scrollThreshold`                   | number                                                                                                                            | 0                                                     | If scroll diff more than `scrollThreshold` setting indexes was skipped. It's can be useful for better fast scroll UX.                                                                                                                                       |
| `renderSpacer`                      | (props: { ref: MutableRefObject<any>; style: CSSProperties; type: 'top' / 'bottom' }) => ReactNode                                | ({ ref, style }) => \<div ref={ref} style={style} /\> | In some rare cases you can use specific elements/styles instead of default spacers                                                                                                                                                                          |
| `count`                             | number                                                                                                                            | optional                                              | You can use items count instead of items directly. Use should use different children: (index: number) => ReactNode                                                                                                                                          |
| `indexesShift `                     | number                                                                                                                            | 0                                                     | Every time you unshift (prepend items) you should increase indexesShift by prepended items count. If you shift items (remove items from top of the list you should decrease indexesShift by removed items count).                                           |
| `getItemBoundingClientRect `        | (element: Element) => DOMRect /  { bottom: number; left: number; right: number; top: number; width: number; height: number; }     | (element) => element.getBoundingClientRect()          | You can use custom rect getter to support `display: contents` or other cases when `element.getBoundingClientRect()` returns "bad" data                                                                                                                      |

## Methods

### scrollToIndex

scrollToIndex method has only one param - options;

**Options param**

| name         | type     | default   | description                                                                                                                                                                                               |
|--------------|----------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `index`      | number   | -1        | Item index for scroll.                                                                                                                                                                                    |
| `alignToTop` | boolean  | true      | [scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) param. Only boolean option supported.                                                                           |
| `offset`     | number   | 0         | Offset after `scrollIntoView ` call.<br>This value will be added to the scroll after scroll to index.                                                                                                     |
| `delay`      | number   | -1        | `setTimeout` delay for initial `scrollToIndex`.                                                                                                                                                           |
| `prerender`  | number   | 0         | This value will modify initial start index and initial end index like `[index - initialPrerender, index + initialPrerender]`.<br>You can use it to avoid blank screen with only one initial item rendered |

**Usage**

```typescript jsx
import { useRef } from 'react';
import { ViewportList } from 'react-viewport-list';

const ItemList = ({
  items,
}: {
  items: { id: string; title: string }[];
}) => {
  const ref = useRef(null);
  const listRef = useRef(null);

  return (
    <div className="scroll-container" ref={ref}>
      <ViewportList
        ref={listRef}
        viewportRef={ref}
        items={items}
      >
        {(item) => (
          <div key={item.id} className="item">
            {item.title}
          </div>
        )}
      </ViewportList>
      <button
        className="up-button"
        onClick={() =>
          listRef.current.scrollToIndex({ index: 0 })
        }
      />
    </div>
  );
};

export { ItemList };
```

## Performance

If you have performance issues, you can add `will-change: transform` to a scroll container.

You should remember that in some situations `will-change: transform` can cause performance issues instead of fixing them.

```css
.scroll-container {
  will-change: transform;
}
```

## Children pseudo-classes

`ViewportList` render two elements (spacers) before first rendered item and after last rendered item.
That's why children pseudo-classes like `:nth-child()`, `:last-child`, `:first-child` may work incorrectly.

## Margin

If you want more accurate virtualizing you should use equal margin for all items.
Also, you should use `margin-top` or `margin-bottom` (not both) for `axis="y"` and `margin-right` or `margin-left` (not both) for `axis="x"`.

If you want to use different margins and stil want more accurate virtualizing you can wrap your items in some element like `<div>` and use `padding` instead of `margin`.

## Non-keyed

You should avoid non-keyed usage of list. You should provide unique key prop for each list items.
If you have issues with scroll in Safari and other browsers without `overflow-anchor` support, check item's `key` prop.

## Advanced Usage

- ### Grouping

  `ViewportList` render `Fragment` with items in viewport. So, grouping just work.

  ```typescript jsx
  import { useRef } from 'react';
  import { ViewportList } from 'react-viewport-list';

  const GroupedItemList = ({
    keyItems,
    items,
  }: {
    keyItems: { id: string; title: string }[];
    items: { id: string; title: string }[];
  }) => {
    const ref = useRef(null);

    return (
      <div className="scroll-container" ref={ref}>
        <span className="group-title">
          Key Items
        </span>
        <ViewportList
          viewportRef={ref}
          items={keyItems}
        >
          {(item) => (
            <div
              key={item.id}
              className="key-item"
            >
              {item.title}
            </div>
          )}
        </ViewportList>
        <span className="group-title">Items</span>
        <ViewportList
          viewportRef={ref}
          items={items}
        >
          {(item) => (
            <div key={item.id} className="item">
              {item.title}
            </div>
          )}
        </ViewportList>
      </div>
    );
  };
  export { GroupedItemList };
  ```

- ### Sorting

  You can use [React Sortable HOC](https://github.com/clauderic/react-sortable-hoc)

  ```javascript
  import { useRef } from 'react';
  import {
    SortableContainer,
    SortableElement,
  } from 'react-sortable-hoc';
  import { ViewportList } from 'react-viewport-list';

  const SortableList = SortableContainer(
    ({ innerRef, ...rest }) => (
      <div {...rest} ref={innerRef} />
    ),
  );

  const SortableItem = SortableElement(
    (props) => <div {...props} />,
  );

  const SortableItemList = ({
    items,
    onSortEnd,
  }) => {
    const ref = useRef(null);

    return (
      <SortableList
        innerRef={ref}
        className="scroll-container"
        onSortEnd={onSortEnd}
      >
        <ViewportList
          viewportRef={ref}
          items={items}
        >
          {(item, index) => (
            <SortableItem
              key={index}
              index={index}
              className="item"
            >
              {item.title}
            </SortableItem>
          )}
        </ViewportList>
      </SortableList>
    );
  };

  export { SortableItemList };
  ```

- ### Scroll to position

  Scroll to position may work incorrectly because scrollHeight and scrollTop (or scrollWidth and scrollLeft) changed automatically while scrolling.
  But you can scroll to position with `scrollToIndex` method with `{ index: 0, offset: scrollPosition }`. For initial scroll to position you can use `initialIndex={0}` and `initialOffset={scrollPosition}`. You should remember that after scroll happened scroll position can be not equal to specified offset.

  ```typescript jsx
  import { useRef } from 'react';
  import { ViewportList } from 'react-viewport-list';

  const ItemList = ({
    items,
    savedScroll,
  }: {
    items: { id: string; title: string }[];
    savedScroll: number;
  }) => {
    const ref = useRef(null);
    const listRef = useRef(null);

    return (
      <div className="scroll-container" ref={ref}>
        <ViewportList
          ref={listRef}
          viewportRef={ref}
          items={items}
          initialIndex={0}
          initialOffset={savedScroll}
        >
          {(item) => (
            <div key={item.id} className="item">
              {item.title}
            </div>
          )}
        </ViewportList>
        <button
          className="up-button"
          onClick={() => {
            // this sets scrollTop of "scroll-container" to 1000
            listRef.current.scrollToIndex({
              index: 0,
              offset: 1000,
            });
          }}
        />
      </div>
    );
  };

  export { ItemList };
  ```

- ### Tests

  You can mock ViewportList for unit tests:

  ```javascript
  import {
      useImperativeHandle,
      forwardRef,
  } from 'react';
  
  export const ViewportListMock = forwardRef((
      { items = [], children },
      ref
  ) => {
      useImperativeHandle(
          ref,
          () => ({
              scrollToIndex: () => {},
          }),
          [],
      );
  
      return (
          <>
              <div />
              {items.map(children)}
              <div />
          </>
      );
  });

  export default ViewportListMock;
  ```
