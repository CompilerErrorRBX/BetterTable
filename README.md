# BetterTable

_BetterTable_ is an _HTML5, CSS3, and JavaScript_ implementation of a table. It uses flex-box based columns to simulate a standard HTML table. _BetterTable_ has no row count limitation as it lazy-loads rows only when needed so initialization time is only impacted by the number of columns and the value of `maxDisplayRows`. The only real limitation on row count comes from individual browser window maximum height [more on that](https://stackoverflow.com/questions/10882769/do-the-browsers-have-a-maximum-height-for-the-body-document).


### [See the live demo](https://stephen-martin.github.io/BetterTable/)

___

## Getting started

#### Initialization example:
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

___

# BetterTable API

## Table
#### Constructor
**Table ( options : `Object` )**
- `options` - an object containing configuration for the table properties. Must contain at least column settings.

Creates a new instance of the _BetterTable_.

#### Properties
**.settings : `Object`**

The object containing the settings for the _BetterTable_.

|Property |Type          |Default        |Description|
|---------|--------------|---------------|-----------|
|appendTo |`<DOMElement>`|`document.body`|The element the table should be appended to.|
|columns  |`Object`      |`{}`           |An object representing columns.|
|columnsDraggable |`Boolean`|`false`|Toggles whether a column can be rearranged or not.|
|customSortClass |`String`|`null`|Sets custom classes for the sort labels on column headers to allow using custom icon font libraries.|
|footer |`Boolean`|`true`|Toggles the footer on the _BetterTable_.|
|headerHeight |`Integer`|`32`|Sets the height of the header row in pixels.|
|maxDisplayRows |`Integer`|`50`|The maximum number of rows to display at a time.|
|rowHeight |`Integer`|`32`|Sets the height of the rows in pixels.|
|rows |`Array`|`[]`|An array of object key-value pairs representing rows of data.|
|showRowIndex |`Boolean`|`true`|Toggles the element showing current row index.|
|toolbar |`Boolean`|`true`|Toggles the toolbar on the _BetterTable_.|
|useNativeSorting |`Boolean`|`false`|Toggles whether the table should handle sorting. **_NOTE:_** It is highly recommended to disable this as sorting is incomplete.|

**.columns : `Object`**

The object containing all generated [Column](#column) Objects.

**.columnData : `Object`**

The data used to generate the [Column](#column) Objects.

**.filter : `String`**

The string to filter the _BetterTable_ rows on. Setting this value will filter the rows in the _BetterTable_.

**.rows : `Array`**

The list of all generated `Row` Objects.

**.rowData : `Array`**

The data used to generate the `Row` Objects. Setting this value will update the rows in the _BetterTable_.

**.rowIndex : `Integer`**

The current row the _BetterTable_ is scrolled to. Setting this value will scroll the row with this index into view.

**.$el : `<DOMElement>`**

The _BetterTable_ element.

**.$bodyEl : `<DOMElement>`**

The column rows container element.

**.$headersEl : `<DOMElement>`**

The headers container element.

**.$columnsEl : `<DOMElement>`**

The columns container element.

#### Methods
**.getSortedColumns ( ) : `Object`**

Retrieves the columns sorted as `asc` and `desc`.

#### Events
**.onCellClick : [Event](#event)**

Fires when any cell is clicked.

**.onCellDoubleClick : [Event](#event)**

Fires when any cell is double clicked.

**.onColumnClick : [Event](#event)**

Fires when any column header is clicked.

**.onColumnDoubleClick : [Event](#event)**

Fires when any column header is double clicked.

**.onRowsUpdate : [Event](#event)**

Fires when any update occurs to the rows.

___

## Column
#### Constructor
**Column ( table : `Table`, id: `String`, data: `Object` )**
- `table` - The [Table](#table) that this column is a part of.
- `id` - The id of the column.
- `data` - An object containing data for the column. 

Creates a new instance of the _BetterTable_ Column.

#### Properties
**.data : `Object`**

The object containing the data for the column.

|Property |Type          |Default        |Description|
|---------|--------------|---------------|-----------|
|name |Required `String`|`""`|The display name for the column.|
|props |Required `Object`|`{}`|The property settings for this column.|

**.settings : `Object`**

The object containing the settings from `data.props` for the column.

|Property |Type          |Default        |Description|
|---------|--------------|---------------|-----------|
|style |`String`|`""`|CSS styling for the column header.|
|cellStyle |`String`|`""`|CSS styling for the column row cells.|
|width |`String`|`null`|CSS width setting for the column. Will be unset if null.|
|minWidth |`String`|`null`|CSS min-width setting for the column. Will be unset if null.|
|order |`Integer`|`1`|The order that the column is rendered in.|
|sort |`ENUM`|`"NONE"`|The sort order for the column. Valid values are `["NONE", "ASC", "DESC"]`.|

**.table : [Table](#table)**

The table that the column is a part of.

**.name : `String`**

The displayed name of this column from `data.name`.

**.id : `String`**

The id string of this column.

**.cells : `Array`**

A list of cells belonging to this column.

**.order : `Integer`**

The order this column appears in the table.

**.sort : `ENUM`**

The sort direction of this column. Can also be used to set the sort direction of this column.

**.$el : `<DOMElement>`**

The column container element of this column.

**.$headerEl : `<DOMElement>`**

The header element of this column.

#### Methods
**.toggleSort ( ) : `Object`**

Toggles the columns sort direction from `NONE` to `ASC` to `DESC`.

#### Events
**.onClick : [Event](#event)**

Fires when the column header is clicked.

**.onDoubleClick : [Event](#event)**

Fires when the column header is double clicked.

___

## Row
#### Constructor
**Row ( table : [Table](#table), data: `Object`, index: `Integer` )**
- `table` - The [Table](#table) that this row is a part of.
- `data` - An object containing data for the row. 
- `index` - The row's index in the table.

Creates a new instance of the _BetterTable_ Row.

#### Properties
**.data : `Object`**

The object containing metadata about the row.

**.table : [Table](#table)**

The [Table](#table) that the row belongs to.

**.cells : `Object`**

The object containing Cells mapped to Columns.
`{ columnId1: 'Some value', columnId2: 'Does not have to be a string.' }`

**.index : `Integer`**

The index of this row within the _BetterTable_.

**.hovered : `Boolean`**

Due to the structure of the _BetterTable_, rows cannot use CSS hovering effects. _BetterTable_ makes row hovering effects possible by exposing this property as well as a `data-hovered` attribute on this row's cells.

#### Methods
_None._

#### Events
**.onMouseOver : [Event](#event)**

Fires when the mouse moves over the row.

**.onMouseLeave : [Event](#event)**

Fires when the mouse moves off of the row.

___

## Cell
#### Constructor
**Cell ( row : [Row](#row), column: [Column](#column), value: `<Type>` )**
- `row` - The [Row](#row) that this cell belongs to.
- `column` - The [Column](#column) that this cell belongs to.
- `value` - The displayed value in the cell. This can be anything that can be displayed in HTML.

Creates a new instance of the _BetterTable_ Cell.

#### Properties
**.value : `<Type>`**

The displayed value in the cell's innerHTML.

**.column : [Column](#column)**

The [Column](#column) that the cell belongs to.

**.row : [Row](#row)**

The [Row](#row) that the cell belongs to.

#### Methods
_None._

#### Events
**.onClick : [Event](#event)**

Fires when the cell is clicked.

**.onDoubleClick : [Event](#event)**

Fires when the cell is double clicked.

___

## Event
_**NOTE:** This is included for reference only as this object is `Private`._

#### Constructor
**Event ( )**

Creates a new instance of the _BetterTable_ Event.

#### Properties
_None._

#### Methods
**.dispatch ( arguments : `Array` ) : `void`**
Dispatches the event passing arbitrary arguments to all of the event's listeners.

**.connect ( action : `function` ) : `Listener`**
Creates a listener for this Event that will be activated when the Event is dispatched.

#### Events
_None._

___

## Listener
_**NOTE:** This is included for reference only as this object is `Private`._

#### Constructor
**Listener ( action : `function`, event : `Event` )**
- `action` - The function to call when the Listener's event is dispatched.
- `event` - The event to listen to.

Creates a new instance of the _BetterTable_ Listener.

#### Properties
_None._

#### Methods
**.execute ( args : `Array` ) : `<Type>`**
Executes this listener's actions and returns anything that the action returned. This function is called by the Event dispatcher.

**.disconnect ( ) : `void`**
Disconnects this listener from its corresponding event.

#### Events
_None._

___

# Dependencies
_None._

# Browser support

|Chrome|Firefox|IE|Edge|Safari|
|------|-------|--|----|------|
|Yes   |Yes    |11|Yes |Yes   |