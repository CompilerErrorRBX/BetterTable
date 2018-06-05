const BetterTable = (function() {
  const BetterTableLibrary = {};

  const Table = (function btTable() {
    function Table(opts) {
      const defaults = {
        columns: {},              // An object representing columns. { email: { name: 'Email', props: {} }, fname: { name: 'Email', props: {} }, lname: { name: 'Email', props: {} } }
        rows: [],                 // An array of object key-value pairs representing rows of data. [{ email: 'stephenlmartin@gmail.com', fname: 'Stephen', lname: 'Martin' }]
        appendTo: null,           // The element the table should be appended to. Defaults to body.
        lazy: true,               // Rows will be lazy loaded in as the user scrolls to them.
        maxDisplayRows: 50,       // The maximum number of rows to display at a time. Requires lazy.
        rowHeight: 32,            // TODO: Make this adjust row size accordingly.
        toolbar: true,            // Toggles the toolbar on the betterTable.
        columnsSortable: true,    // Whether the columns can be sorted or not.
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

      // Elements
      this.$el = null;
      this.$bodyEl = null;
      this.$progressEl = null;
      this.$progressBarEl = null;
      this.$containerEl = null;
      this.$columnsContainer = null;
      this.$headerContainer = null;
      this.$rowsContainer = null;

      this.__processColumns();
      this.__init();
      this.__render();
    }

    Table.prototype = {
      __init: function() {
        const $betterTableEl = document.createElement('div');
        $betterTableEl.className = 'betterTable';

        const $btMainContainerEl = document.createElement('div');
        $btMainContainerEl.className = 'bt-main-container bt-header-floated';

        const $btContainerEl = document.createElement('div');
        $btContainerEl.className = 'bt-container';
        
        const $btProgressEl = document.createElement('div');
        $btProgressEl.className = 'bt-progress';

        const $btProgressBarEl = document.createElement('div');
        $btProgressBarEl.className = 'bt-progress-bar';

        const $btTable = document.createElement('div');
        $btTable.className = 'bt-table';

        const $btColumns = document.createElement('div');
        $btColumns.className = 'bt-columns';

        const $btHeader = document.createElement('div');
        $btHeader.className = 'bt-header';

        const $btHeaderContainer = document.createElement('div');
        $btHeaderContainer.className = 'bt-header-container';

        const $btBody = document.createElement('div');
        $btBody.className = 'bt-body';

        // betterTable
        // -> bt-toolbar
        // -> bt-main-container bt-header-floated
        //    -> bt-progress
        //      -> bt-progress-bar
        //    -> bt-container
        //       -> bt-table
        //          -> bt-columns
        //          -> bt-header
        //             -> bt-header-container
        //          -> bt-body

        $btHeader.appendChild($btHeaderContainer);
        $btTable.appendChild($btColumns);
        $btTable.appendChild($btHeader);
        $btTable.appendChild($btBody);
        $btProgressEl.appendChild($btProgressBarEl);
        $btContainerEl.appendChild($btTable);
        $btMainContainerEl.appendChild($btProgressEl);
        $btMainContainerEl.appendChild($btContainerEl);

        if (this.settings.toolbar) {
          const $btToolbar = document.createElement('div');
          $btToolbar.className = 'bt-toolbar';

          $betterTableEl.appendChild($btToolbar);

          this.$toolbarEl = $btToolbar;
        }

        $betterTableEl.appendChild($btMainContainerEl);

        if (this.settings.appendTo) {
          this.settings.appendTo.appendChild($betterTableEl);
        } else {
          document.body.appendChild($betterTableEl);
        }

        this.$el = $betterTableEl;
        this.$bodyEl = $btTable;
        this.$progressEl = $btProgressEl;
        this.$progressBarEl = $btProgressBarEl;
        this.$containerEl = $btContainerEl;
        this.$columnsContainer = $btColumns;
        this.$headerEl = $btHeader;
        this.$headerContainer = $btHeaderContainer;
        this.$rowsContainer = $btBody;

        this.$containerEl.onscroll = (function (e) {
          this.__renderRows();
          this.$headerContainer.style.right = this.$containerEl.scrollLeft + 'px';
        }.bind(this));

        this.__onRender.dispatch();
      },

      __render: function() {
        const $columnContainer = document.createDocumentFragment();
        const $headerContainer = document.createDocumentFragment();
        this.__columnsOrdered.forEach(function(columnName) {
          const column = this.columns[columnName];
          $columnContainer.appendChild(column.$el);
          $headerContainer.appendChild(column.$headerEl);
          column.__render();
        }.bind(this));

        this.$columnsContainer.appendChild($columnContainer);
        this.$headerContainer.appendChild($headerContainer);

        this.__renderRows();

        this.__onRender.dispatch();
      },

      __renderRows: function() {
        const dataLength = this.__filteredRows ? this.__filteredRows.length : this.rowData.length;
        const absoluteHeight = this.settings.rowHeight * dataLength;
        const containerHeight = this.$containerEl.clientHeight;

        const scroll = Math.max(Math.min(this.$containerEl.scrollTop, absoluteHeight - containerHeight), 0);

        const scrollRowIndex = Math.floor(scroll / this.settings.rowHeight);
        const rowRange = Math.min(scrollRowIndex + this.settings.maxDisplayRows, dataLength);

        const offset = Math.min(Math.max(scrollRowIndex - Math.floor(this.settings.maxDisplayRows / 2), 0), Math.floor(this.settings.maxDisplayRows / 2));
        const scrollOffset = scroll - (offset * this.settings.rowHeight);

        this.$bodyEl.style.paddingTop = (Math.floor(scrollOffset / this.settings.rowHeight) * this.settings.rowHeight) + 'px';
        this.$bodyEl.style.paddingBottom = Math.max((absoluteHeight - containerHeight) - scroll, 0) + 'px';
        
        const $rowContainer = document.createDocumentFragment();
        for (let i = scrollRowIndex - offset; i < rowRange; i++) {
          let index = i;
          
          if (this.__filteredRows) {
            index = this.__filteredRows[i].index;
          }
          
          const row = this.rows[index] || this.__processRow(index);
          row.__render();
          $rowContainer.appendChild(row.$el);
        }
        this.$rowsContainer.innerHTML = '';
        this.$rowsContainer.appendChild($rowContainer);
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
      get processing() {
        return this.__proccessing;
      },
      set processing(boolean) {
        this.__proccessing = boolean;
        if (boolean === true) {
          this.$progressEl.classList.add('active');
        } else {
          this.$progressEl.classList.remove('active');
        }
      },
      get progress() {
        return this.__progress;
      },
      set progress(percentage) {
        this.__progress = percentage;
        this.$progressBarEl.style.width = percentage + '%';
      },
      get filter() {
        return this.__filter;
      },
      set filter(filterString) {
        if (filterString === '') {
          this.__filteredRows = null;
          return;
        }

        this.progress = 0;
        this.processing = true;

        const filterStringLower = filterString.toLowerCase();

        const tick = Date.now();
        this.__filteredRows = this.rowData.reduce(function (rows, row, index) {
          const cells = Object.keys(row);
          for (let i = 0; i < cells.length; i++) {
            if (row[cells[i]].toLowerCase().indexOf(filterStringLower) > -1) {
              rows.push({ row, index });
              break;
            }
          }
          
          return rows;
        }.bind(this), []);
        console.log('Filtering', this.rowData.length, 'rows took:', (Date.now() - tick) + 'ms');

        this.__renderRows();

        this.progress = 100;
        this.processing = false;
      },
    };

    return Table;
  })();

  const Column = (function btColumn() {
    function Column(table, name, opts) {
      const defaults = {
        style: '',
        cellStyle: '',
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
        $columnEl.className = 'bt-column';
        $columnEl.style = this.settings.style;

        const $headerEl = document.createElement('div');
        $headerEl.className = 'bt-header-cell';
        $headerEl.style = this.settings.style;

        const $body = document.createElement('span');
        $body.className = 'bt-header-body';
        $body.innerHTML = this.name;

        const $sortEl = document.createElement('div');
        $sortEl.className = 'bt-column-sort none';

        $headerEl.appendChild($body);
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
        this.$sortEl.className = 'bt-column-sort ' + val;
      }
    };

    return Column;
  })();

  const Row = (function btRow() {
    function Row(table, index) {
      this.table = table;
      this.cells = {};
      this.index = index;

      this.onCellAdd = new Event();
      this.onCellRemove = new Event();

      this.$el = null;
    }

    Row.prototype = {
      __render: function () {
        if (!this.$el) {
          const $rowEl = document.createElement('div');
          $rowEl.className = 'bt-row';

          this.$el = $rowEl;

          const $container = document.createDocumentFragment();
          this.table.__columnsOrdered.forEach(function (column) {
            const cell = this.cells[column];
            cell.__render();
            $container.appendChild(cell.$el);
          }.bind(this));

          this.$el.appendChild($container);
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
        const $cellEl = document.createElement('div');
        $cellEl.className = 'bt-cell';
        $cellEl.innerHTML = this.value;
        $cellEl.style = this.column.settings.cellStyle;

        $cellEl.onclick = (function() {
          this.onClick.dispatch(this);
          this.row.table.onCellClick.dispatch(this);
        }).bind(this);
      
        $cellEl.ondblclick = (function () {
          this.onDoubleClick.dispatch(this);
          this.row.table.onCellDoubleClick.dispatch(this);
        }).bind(this);

        this.$el = $cellEl;
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
