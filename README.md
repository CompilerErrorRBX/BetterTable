# BetterTable

BetterTable is an HTML5, CSS3, and JavaScript implementation of a table. Its goal is to create a table with lazy-loaded rows and a fixed header.

[See the demo](https://stephen-martin.github.io/BetterTable/)

## Getting started

### Initialization example:
```js
new BetterTable.Table({
  columns: {
    column1: {
      name: 'ColumnHeader',
      props: {
        width: '100%',
        minWidth: '800px',
        cellStyle: 'background-color: red;',
      },
    },
  },
  rows: [
    {
      column1: 'Hello, World! I am a cell!'
    }
  ],
  appendTo: document.body,
  maxDisplayRows: 36,
  rowHeight: 32,
  headerHeight: 48,
  toolbar: true,
});
```
