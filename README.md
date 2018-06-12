# BetterTable

BetterTable is an HTML5, CSS3, and JavaScript implementation of a table. It uses flexbox based columns to simulate a standard HTML table. BetterTable has no row count limitation as it lazy-loads rows only when needed so initialization time is only impacted by the number of columns and the value of `maxDisplayRows`. The only real limitation on row count comes from individual browser window maximum height [more on that](https://stackoverflow.com/questions/10882769/do-the-browsers-have-a-maximum-height-for-the-body-document).

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

## Browser support

|Chrome|Firefox|IE|Edge|Safari|
|------|-------|--|----|------|
|Yes   |Yes    |11|Yes |Yes   |