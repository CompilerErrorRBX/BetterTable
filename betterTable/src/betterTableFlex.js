const BetterTable = (function() {
  const BetterTableLibrary = {};

  const Table = (function btTable() {
    function Table(opts) {
      const defaults = {
        columns: {},              // An object representing columns. { email: { name: 'Email', props: {} }, fname: { name: 'Email', props: {} }, lname: { name: 'Email', props: {} } }
        rows: [],                 // An array of object key-value pairs representing rows of data. [{ email: 'stephenlmartin@gmail.com', fname: 'Stephen', lname: 'Martin' }]
        appendTo: null,           // The element the table should be appended to. Defaults to body.
        maxDisplayRows: 50,       // The maximum number of rows to display at a time.
        rowHeight: 32,            // TODO: Make this adjust row size accordingly.
        headerHeight: 32,         // Adjusts the height of the header row.
        toolbar: true,            // Toggles the toolbar on the betterTable.
        columnsSortable: true,    // Whether the columns can be sorted or not.
        columnHeight: 'auto',     // Specify column height in pixels, setting this to auto will make BetterTable attempt to get the actual height.
        // TODO: Handle max display columns as well
      };

      this.settings = extend(defaults, opts);
      this.columns = {};
      this.rows = [];

      this.__rowData = this.settings.rows;
      this.__columnData = this.settings.columns;
      this.__columnsOrdered = [];
      this.__filter = '';
      this.__filteredRows = null;
      this.__proccessing = false;
      this.__progress = 0;

      // Events
      this.onCellClick = new Event(); // When any cell is clicked. Returns the Cell clicked
      this.onCellDoubleClick = new Event(); // When any cell is double-clicked
      this.onColumnClick = new Event(); // When the header of a column is clicked. Returns the Cell clicked
      this.onColumnDoubleClick = new Event(); // When the header of a column is double-clicked

      this.__onRender = new Event();

      this.__processColumns();
      this.__init();
      this.__render();
    }

    Table.prototype = {
      __init: function() {
        const $betterTableFlex = document.createElement('div');
        $betterTableFlex.className = 'better-table-flex';

        const $btfTable = document.createElement('div');
        $btfTable.className = 'btf-table';

        const $btfHeaders = document.createElement('div');
        $btfHeaders.className = 'btf-headers';
        $btfHeaders.style.minHeight = this.settings.headerHeight + 'px';
        
        const $btfBody = document.createElement('div');
        $btfBody.className = 'btf-body';

        const $btfColumns = document.createElement('div');
        $btfColumns.className = 'btf-columns';

        if (this.settings.toolbar) {
          const $btfToolbar = document.createElement('div');
          $btfToolbar.className = 'btf-toolbar';

          $btfTable.appendChild($btfToolbar);

          this.$toolbarEl = $btfToolbar;
        }

        $btfBody.appendChild($btfColumns);
        $btfTable.appendChild($btfHeaders);
        // $btfTable.appendChild($btfColumns);
        $btfTable.appendChild($btfBody);
        $betterTableFlex.appendChild($btfTable);

        if (this.settings.appendTo) {
          this.settings.appendTo.appendChild($betterTableFlex);
        } else {
          document.body.appendChild($betterTableFlex);
        }

        this.$el = $betterTableFlex;
        this.$tableEl = $btfTable;
        this.$bodyEl = $btfBody;
        this.$headersEl = $btfHeaders;
        this.$columnsEl = $btfColumns;

        this.$bodyEl.onscroll = (function (e) {
          this.__renderRows();
          this.$headersEl.style.right = this.$bodyEl.scrollLeft + 'px';
        }.bind(this));

        this.__onRender.dispatch();
      },

      __render: function() {
        this.__renderColumns();
        this.__renderRows();

        this.__onRender.dispatch();
      },

      __renderColumns: function() {
        const $columnContainer = document.createDocumentFragment();
        const $headerContainer = document.createDocumentFragment();
        this.__columnsOrdered.forEach(function (columnName) {
          const column = this.columns[columnName];
          $columnContainer.appendChild(column.$el);
          $headerContainer.appendChild(column.$headerEl);

          column.__render();
        }.bind(this));

        this.$columnsEl.innerHTML = '';
        this.$headersEl.innerHTML = '';

        this.$columnsEl.appendChild($columnContainer);
        this.$headersEl.appendChild($headerContainer);
      },

      __renderRows: function() {
        const dataLength = this.__filteredRows ? this.__filteredRows.length : this.rowData.length;
        const absoluteHeight = this.settings.rowHeight * dataLength;
        const containerHeight = this.$bodyEl.clientHeight;

        const scroll = Math.max(Math.min(this.$bodyEl.scrollTop, absoluteHeight - containerHeight), 0);

        const scrollRowIndex = Math.floor(scroll / this.settings.rowHeight);
        const rowRange = Math.min(scrollRowIndex + this.settings.maxDisplayRows, dataLength);

        const offset = Math.min(Math.max(scrollRowIndex - Math.floor(this.settings.maxDisplayRows / 2), 0), Math.floor(this.settings.maxDisplayRows / 2));
        const scrollOffset = scroll - (offset * this.settings.rowHeight);

        this.$columnsEl.style.top = (Math.floor(scrollOffset / this.settings.rowHeight) * this.settings.rowHeight) + 'px';
        this.$columnsEl.style.paddingBottom = Math.max((absoluteHeight - containerHeight) - scroll, 0) + 'px';
        
        const containers = {};

        for (let i = 0; i < this.__columnsOrdered.length; i++) {
          const columnName = this.__columnsOrdered[i];
          containers[columnName] = document.createDocumentFragment();
        }

        for (let i = scrollRowIndex - offset; i < rowRange; i++) {
          let index = i;
          
          if (this.__filteredRows) {
            index = this.__filteredRows[i].index;
          }
          
          const row = this.rows[index] || this.__processRow(index);


          row.__render();

          for (let i = 0; i < this.__columnsOrdered.length; i++) {
            const columnName = this.__columnsOrdered[i];
            containers[columnName].appendChild(row.cells[columnName].$el);
          }
          // $rowContainer.appendChild(row.$el);
        }

        for (let i = 0; i < this.__columnsOrdered.length; i++) {
          const columnName = this.__columnsOrdered[i];
          const column = this.columns[columnName];
          column.$el.innerHTML = '';
          column.$el.appendChild(containers[columnName]);
        }
        // this.$rowsContainer.innerHTML = '';
        // this.$rowsContainer.appendChild($rowContainer);
      },

      __processColumns: function() {
        const data = this.columnData;
        const columns = {};
        Object.keys(data).forEach(function(column) {
          const columnData = data[column];
          columns[column] = new Column(this, columnData.name, columnData.props);
          this.__columnsOrdered.push(column);
        }.bind(this));

        this.columns = columns;
        return columns;
      },

      __processRow: function (index) {
        const row = new Row(this, index);
        const rowData = this.rowData[index];

        Object.keys(this.columnData).map(function (columnData) {
          const value = rowData[columnData] || '';
          const column = this.columns[columnData];

          const cell = new Cell(row, column, value);

          row.cells[columnData] = cell;
          if (column) {
            column.cells.push(cell);
          }
        }.bind(this));

        this.rows[index] = row;
        return row;
      },

      // Getters and Setters.
      get rowData() {
        return this.__rowData;
      },
      set rowData(data) {
        this.__rowData = data;
        this.rows = [];
        this.__renderRows();
      },
      get columnData() {
        return this.__columnData;
      },
      get filter() {
        return this.__filter;
      },
      set filter(filterString) {
        if (filterString === '') {
          this.__filteredRows = null;
          return;
        }

        const filterStringLower = filterString.toLowerCase();

        const tick = Date.now();
        this.__filteredRows = this.rowData.reduce(function (rows, row, index) {
          const cells = Object.keys(row);
          for (let i = 0; i < cells.length; i++) {
            if (row[cells[i]].toLowerCase().indexOf(filterStringLower) > -1) {
              rows.push({ row: row, index: index });
              break;
            }
          }
          
          return rows;
        }.bind(this), []);
        console.log('Filtering', this.rowData.length, 'rows took:', (Date.now() - tick) + 'ms');

        this.__renderRows();
      },
    };

    return Table;
  })();

  const Column = (function btColumn() {
    function Column(table, name, opts) {
      const defaults = {
        style: '',
        cellStyle: '',
        width: null,
        minWidth: null,
      };

      this.settings = extend(defaults, opts);

      this.table = table;
      this.name = name;
      this.cells = [];

      this.__sort = 'none';

      this.onClick = new Event();
      this.onDoubleClick = new Event();

      this.$el = null;
      this.$headerEl = null;

      this.__init();
    }

    Column.prototype = {
      __init: function() {
        const $columnEl = document.createElement('div');
        $columnEl.className = 'btf-column';
        $columnEl.style = this.settings.style;

        const $headerEl = document.createElement('div');
        $headerEl.className = 'btf-header';
        $headerEl.style = this.settings.style;
        $headerEl.innerHTML = this.name;

        if (this.settings.width) {
          const width = this.settings.width;
          $columnEl.style.width = width;
          $headerEl.style.width = width;
          $columnEl.style.minWidth = width;
          $headerEl.style.minWidth = width;
        }

        if (this.settings.minWidth) {
          const width = this.settings.minWidth;
          $columnEl.style.minWidth = width;
          $headerEl.style.minWidth = width;
        }

        const $sortEl = document.createElement('div');
        $sortEl.className = 'btf-column-sort none';

        $headerEl.appendChild($sortEl);

        $headerEl.onclick = (function () {
          this.onClick.dispatch(this);
          this.table.onColumnClick.dispatch(this);
        }).bind(this);

        $headerEl.ondblclick = (function () {
          this.onDoubleClick.dispatch(this);
          this.table.onColumnDoubleClick.dispatch(this);
        }).bind(this);

        this.$el = $columnEl;
        this.$sortEl = $sortEl;
        this.$headerEl = $headerEl;
      },
      __render: function() {

      },
      toggleSort: function() {
        switch(this.__sort) {
          case 'none':
            this.sort = 'asc';
            break;
          case 'asc':
            this.sort = 'desc';
            break;
          case 'desc':
            this.sort = 'none';
        }
      },
      get sort() {
        return this.__sort;
      },
      set sort(value) {
        const val = value.toLowerCase();
        const allowed = ['asc', 'desc', 'none'];
        if (allowed.indexOf(val) === -1) {
          console.warn('BetterTable columns can only be sorted as ' + allowed.toString());
          return;
        }
        this.__sort = val;
        this.$sortEl.className = 'btf-column-sort ' + val;
      }
    };

    return Column;
  })();

  const Row = (function btRow() {
    function Row(table, index) {
      this.table = table;
      this.cells = {};
      this.index = index;
      this.__processed = false;
    }

    Row.prototype = {
      __render: function () {
        if (!this.__proccessed) {
          this.__proccessed = true;
          this.table.__columnsOrdered.forEach(function (column) {
            const cell = this.cells[column];
            cell.__render();
          }.bind(this));
        }
      },
    };

    return Row;
  })();

  const Cell = (function btCell() {
    function Cell(row, column, value) {
      this.value = value;
      this.column = column;
      this.row = row;

      this.onClick = new Event();
      this.onDoubleClick = new Event();

      this.$el = null;
    }

    Cell.prototype = {
      __render: function () {
        if (!this.$el) {
          const $cellEl = document.createElement('div');
          $cellEl.className = 'btf-cell';
          $cellEl.innerHTML = this.value;
          $cellEl.style = this.column.settings.cellStyle;
          $cellEl.style.minHeight = this.column.table.settings.rowHeight + 'px';
          $cellEl.title = $cellEl.innerText;

          $cellEl.onclick = (function() {
            this.onClick.dispatch(this);
            this.row.table.onCellClick.dispatch(this);
          }).bind(this);
        
          $cellEl.ondblclick = (function () {
            this.onDoubleClick.dispatch(this);
            this.row.table.onCellDoubleClick.dispatch(this);
          }).bind(this);

          this.$el = $cellEl;
        }
      },
    };

    return Cell;
  })();

  const Promise = (function promiseObject() {
    function Promise(callback) {
      this.__then = new Event();
      this.__catch = new Event();
      this.__finally = new Event();

      function resolve(args) {
        this.__then.dispatch(args);
        this.__finally.dispatch(args);
      }
      function reject(args) {
        this.__catch.dispatch(args);
        this.__finally.dispatch(args);
      }

      callback(resolve.bind(this), reject.bind(this));
    }

    Promise.prototype = {
      then: function (action) { // When the promise completes
        this.__then.connect(action);
      },
      catch: function (action) { // When the promise fails
        this.__catch.connect(action);
      },
      finally: function (action) { // When the promise completes or fails
        this.__finally.connect(action);
      },
    };

    return Promise;
  })();

  const Event = (function eventObject() {
    function Event() {
      this.__listeners = [];
    }

    Event.prototype = {
      dispatch: function (args) { // Triggers the event causing all listener actions to fire.
        this.__listeners.forEach(function (listener) {
          listener.execute(args);
        });
      },
      connect: function (action) { // Connects a listener to this event with the corresponding action.
        const listener = new Listener(action, this);
        this.__listeners.push(listener);
        return listener;
      },
    };

    return Event;
  })();

  const Listener = (function listenerObject() {
    function Listener(action, event) {
      this.__event = event;
      this.__action = action;
    }

    Listener.prototype = {
      execute: function (args) { // Executes the listener's action
        return this.__action(args);
      },
      disconnect: function () { // Disconnects the listener from its corresponding event
        const index = this.__event.__listeners.indexOf(this);
        if (index > -1) {
          this.__event.__listeners.slice(index, 1);
        }
      },
    };

    return Listener;
  })();

  // Helper to extend object properties
  function extend(extendsFrom, obj) {
    var extension = Object.assign({}, extendsFrom);
    for (var i in obj) {
      if (obj.hasOwnProperty(i)) {
        extension[i] = obj[i];
      }
    }
    return extension;
  };

  // BetterTable library objects
  
  BetterTableLibrary.Table = Table;
  BetterTableLibrary.Row = Row;
  BetterTableLibrary.Column = Column;
  BetterTableLibrary.Cell = Cell;

  return BetterTableLibrary;
})();
