const BetterTable = (function() {
  const BetterTableLibrary = {};

  const Table = (function btTable() {
    function Table(opts) {
      const defaults = {
        columns: {},              // An object representing columns. { email: 'Email', fname: 'First name', lname: 'Last name' }
        rows: [],                 // An array of object key-value pairs representing rows of data. [{ email: 'stephenlmartin@gmail.com', fname: 'Stephen', lname: 'Martin' }]
        appendTo: null,           // The element the table should be appended to. Defaults to body.
        lazy: true,               // Rows will be lazy loaded in as the user scrolls to them.
        maxDisplayRows: 100,      // The maximum number of rows to display at a time. Requires lazy.
        rowHeight: 32,            // TODO: Make this adjust row size accordingly.
        toolbar: true,            // Toggles the toolbar on the betterTable.
        // TODO: Handle max display columns as well
      };

      this.settings = extend(defaults, opts);
      this.columns = {};
      this.rows = [];

      this.__rowData = this.settings.rows;
      this.__columnData = this.settings.columns;
      this.__columnsOrdered = [];
      this.__filter = '';
      this.__filteredRows = [];

      // Events
      this.__onRender = new Event();

      // Elements
      this.$el = null;
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
        $btContainerEl.appendChild($btTable);
        $btMainContainerEl.appendChild($btContainerEl);

        if (this.settings.toolbar) {
          const $btToolbar = document.createElement('div');
          $btToolbar.className = 'bt-toolbar';

          $betterTableEl.appendChild($btToolbar);
        }

        $betterTableEl.appendChild($btMainContainerEl);

        if (this.settings.appendTo) {
          this.settings.appendTo.appendChild($betterTableEl);
        } else {
          document.body.appendChild($betterTableEl);
        }

        this.$el = $betterTableEl;
        this.$bodyEl = $btTable;
        this.$containerEl = $btContainerEl;
        this.$columnsContainer = $btColumns;
        this.$headerContainer = $btHeaderContainer;
        this.$rowsContainer = $btBody;

        this.$containerEl.onscroll = (function (e) {
          this.__renderRows();
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
        const absoluteHeight = this.settings.rowHeight * this.rowData.length;
        const containerHeight = this.$containerEl.clientHeight;

        const scroll = Math.min(this.$containerEl.scrollTop, absoluteHeight - containerHeight);

        const scrollRowIndex = Math.floor(scroll / this.settings.rowHeight);
        const rowRange = Math.min(scrollRowIndex + this.settings.maxDisplayRows, this.rowData.length);

        const offset = Math.min(Math.max(scrollRowIndex - Math.floor(this.settings.maxDisplayRows / 2), 0), Math.floor(this.settings.maxDisplayRows / 2));
        const scrollOffset = scroll - (offset * this.settings.rowHeight);

        this.$bodyEl.style.paddingTop = (Math.floor(scrollOffset / this.settings.rowHeight) * this.settings.rowHeight) + 'px';
        this.$bodyEl.style.paddingBottom = ((absoluteHeight - containerHeight) - scroll) + 'px';
        
        const $rowContainer = document.createDocumentFragment();
        for (let i = scrollRowIndex - offset; i < rowRange; i++) {
          const row = this.rows[i] || this.__processRow(i);
          row.__render();
          $rowContainer.appendChild(row.$el);
        }
        this.$rowsContainer.innerHTML = ''; // TODO: Find a more efficient way to clear and redraw.
        this.$rowsContainer.appendChild($rowContainer);
      },

      __processColumns: function() {
        const data = this.columnData;
        const columns = {};
        Object.keys(data).forEach(function(column) {
          const name = data[column];
          columns[column] = new Column(name);
          this.__columnsOrdered.push(column);
        }.bind(this));

        this.columns = columns;
        return columns;
      },

      __processRow: function (index) {
        const row = new Row(this);
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
      },
      get columnData() {
        return this.__columnData;
      },
      set columnData(data) {
        this.__columnData = data;
      },
      get filter() {
        return this.__filter;
      },
      set filter(filter) {
        if (filter === '') {
          this.__filteredRows = this.rows;
        }
      },
    };

    return Table;
  })();

  const Column = (function btColumn() {
    function Column(name, opts) {
      const defaults = {
        style: '',
      };

      this.settings = extend(defaults, opts);

      this.name = name;
      this.cells = [];

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
        $headerEl.className = 'bt-cell';
        $headerEl.style = this.settings.style;
        $headerEl.innerHTML = this.name;

        this.$el = $columnEl;
        this.$headerEl = $headerEl;
      },
      __render: function() {

      },
    };

    return Column;
  })();

  const Row = (function btRow() {
    function Row(table) {
      this.table = table;
      this.cells = {};

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
      __filter: function(filter) {
        Object.keys(this.cells).filter(function(cell) {
          const value = this.cells[cell].value;
          if (value.indexOf(filter) > -1) {
            return true;
          }
        }.bind(this));

        return false;
      },
    };

    return Row;
  })();

  const Cell = (function btCell() {
    function Cell(row, column, value) {
      this.value = value;

      this.$el = null;
    }

    Cell.prototype = {
      __render: function () {
        const $cellEl = document.createElement('div');
        $cellEl.className = 'bt-cell';
        $cellEl.innerHTML = this.value;

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

      callback(this.__resolve.bind(this), this.__reject.bind(this));
    }

    Promise.prototype = {
      __resolve: function (args) {
        this.__then.dispatch(args);
        this.__finally.dispatch(args);
      },
      __reject: function (args) {
        this.__catch.dispatch(args);
        this.__finally.dispatch(args);
      },
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
