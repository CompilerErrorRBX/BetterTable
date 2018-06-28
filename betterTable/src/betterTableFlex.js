const BetterTable = (function() {
  const BetterTableLibrary = {};

  const Table = (function btTable() {
    function Table(opts) {
      const defaults = {
        appendTo: null,           // The element the table should be appended to. Defaults to body.
        columns: {},              // An object representing columns. { email: { name: 'Email', props: {} }, fname: { name: 'Email', props: {} }, lname: { name: 'Email', props: {} } }
        columnsDraggable: false,  // Toggles whether a column can be rearranged or not
        customSortClass: '',      // Sets custom classes for the sort labels on column headers to allow using custom icon font libraries.
        footer: true,             // Toggles the footer on the betterTable.
        headerHeight: 32,         // Adjusts the height of the header row.
        maxDisplayRows: 50,       // The maximum number of rows to display at a time.
        rowHeight: 32,            // TODO: Make this adjust row size accordingly.
        rows: [],                 // An array of object key-value pairs representing rows of data. [{ email: 'someemail@gmail.com', fname: 'Bob', lname: 'Evans' }]
        showRowIndex: true,       // Toggles the element showing current row index.
        toolbar: true,            // Toggles the toolbar on the betterTable.
        useNativeSorting: false,  // Toggles whether the table should handle sorting.
        // TODO: Handle max display columns as well
      };

      this.settings = extend(defaults, opts);
      this.columns = {};
      this.rows = [];

      // Elements
      this.$el = null;
      this.$tableEl = null;
      this.$bodyEl = null;
      this.$headersEl = null;
      this.$columnsEl = null;

      // Events
      this.onCellClick = new Event();         // When any cell is clicked. Returns the Cell clicked
      this.onCellDoubleClick = new Event();   // When any cell is double-clicked
      this.onColumnClick = new Event();       // When the header of a column is clicked. Returns the Cell clicked
      this.onColumnDoubleClick = new Event(); // When the header of a column is double-clicked
      this.onRowsUpdate = new Event();        // When the list or rows is changed

      // Private
      this.__columnData = this.settings.columns;
      this.__columnsOrdered = [];
      this.__currentIndex = 0;
      this.__filter = '';
      this.__filteredRows = null;
      this.__rowData = this.settings.rows;
      this.__originalRowData = this.settings.rows;
      this.__rowIndexInputDebounce = null;

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
        $btfTable.appendChild($btfBody);

        if (this.settings.footer) {
          const $btfFooter = document.createElement('div');
          $btfFooter.className = 'btf-footer';

          const $btfScrollIndex = document.createElement('div');
          $btfScrollIndex.className = 'btf-scroll-index';

          const $btfIndexInput = document.createElement('input');
          $btfIndexInput.className = 'btf-index-input';
          $btfIndexInput.type = 'number';

          $btfFooter.appendChild($btfScrollIndex);
          $btfTable.appendChild($btfFooter);

          this.$footerEl = $btfFooter;
          this.$scrollIndexEl = $btfScrollIndex;
          this.$indexInputEl = $btfIndexInput;

          const $textContainer = document.createDocumentFragment();
          const $topIndex = document.createElement('span');
          const $totalIndex = document.createElement('span');
          $textContainer.appendChild($topIndex);
          $textContainer.appendChild(this.$indexInputEl);
          $textContainer.appendChild($totalIndex);

          this.$__indexFront = $topIndex;
          this.$__indexEnd = $totalIndex;

          this.$scrollIndexEl.appendChild($textContainer);

          this.$indexInputEl.oninput = function(e) { this.__rowIndexInput(e) }.bind(this);
        }

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
        for (let i = 0; i < this.__columnsOrdered.length; i++) {
          const column = this.columns[this.__columnsOrdered[i]];
          $columnContainer.appendChild(column.$el);
          $headerContainer.appendChild(column.$headerEl);

          column.__render();
        }

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

        for (i = scrollRowIndex - offset; i < rowRange; i++) { // Get all rows in view
          const index = this.__filteredRows ? this.__filteredRows[i] : i;
          const row = this.rows[index] || this.__processRow(index);
          row.__render();

          for (let j = 0; j < this.__columnsOrdered.length; j++) {
            const columnName = this.__columnsOrdered[j];
            row.cells[columnName].$el.setAttribute('data-hovered', false);
            row.cells[columnName].$el.setAttribute('data-row-odd', i % 2 === 1);
            containers[columnName].appendChild(row.cells[columnName].$el); // Append row cells to respective column fragments
          }
        }

        for (i = 0; i < this.__columnsOrdered.length; i++) {
          const columnName = this.__columnsOrdered[i];
          const column = this.columns[columnName];
          column.$el.innerHTML = '';
          column.$el.appendChild(containers[columnName]); // Append column fragments to their respective column elements
        }

        this.__currentIndex = Math.min(scrollRowIndex + Math.floor(containerHeight / this.settings.rowHeight), dataLength-1);
        if (this.settings.showRowIndex) {
          const fromIndex = (scrollRowIndex + 1).toLocaleString();
          const toIndex = (this.__currentIndex + 1);
          if (scrollRowIndex >= this.__currentIndex) {
            this.$__indexFront.innerHTML = 'Showing ' + fromIndex;
            this.$indexInputEl.style.display = 'none';
            this.$__indexEnd.innerHTML = ' of ' + dataLength.toLocaleString() + ' entries'
          } else {
            this.$indexInputEl.style.display = 'inline-flex';
            this.$__indexFront.innerHTML = 'Showing ' + fromIndex + ' to ';
            this.$indexInputEl.value = toIndex;
            this.$__indexEnd.innerHTML = ' of ' + dataLength.toLocaleString() + ' entries'
          }
        }
      },

      __processColumns: function() {
        const data = this.columnData;
        const columns = {};

        for (let i = 0; i < Object.keys(data).length; i++) {
          const column = Object.keys(data)[i];
          const columnData = data[column];
          columns[column] = new Column(this, column, columnData);
          this.__columnsOrdered.push(column);
        }

        this.columns = columns;
        return columns;
      },

      __processRow: function (index) {
        const rowData = this.rowData[index];
        const row = new Row(this, rowData, index);

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

      __rowIndexInput: function(e) {
        this.rowIndex = this.$indexInputEl.value;
      },

      __updateRows: function(rows) {
        this.__rowData = rows;
        this.rows = [];
        this.__renderRows();
        this.onRowsUpdate.dispatch(rows);
      },

      __sortRows: function(columnName, order) {
        if (order === 'none') {
          this.__updateRows(this.__originalRowData);
          return;
        }

        const rows = [];

        const originalRows = this.__originalRowData;
        const modifier = order === 'asc' ? 1 : -1;
        let i = originalRows.length;
        while (i--) rows[i] = originalRows[i];

        quickSort(rows, 0, rows.length - 1, rows.length, function (x, y) {
          if (x[columnName] > y[columnName]) {
            return 1 * modifier;
          } else if (y[columnName] > x[columnName]) {
            return -1 * modifier;
          } else {
            return 0;
          }
        });

        this.__updateRows(rows);
      },
      getSortedColumns: function() {
        const columnKeys = Object.keys(this.columns);
        const sortedColumns = {};

        for (let i = 0; i < columnKeys.length; i++) {
          var col = this.columns[columnKeys[i]];
          const sort = col.sort;
          if (sort !== 'none') {
            sortedColumns[col.id] = sort;
          }
        }

        return sortedColumns;
      },

      // Getters and Setters.
      get rowData() {
        return this.__rowData;
      },
      set rowData(data) {
        this.__originalRowData = data;
        this.__updateRows(data);
      },
      get rowIndex() {
        return this.__currentIndex;
      },

      set rowIndex(index) {
        this.$bodyEl.scrollTop = (index * this.settings.rowHeight) - (this.$bodyEl.clientHeight);
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
        this.__filteredRows = this.rowData.reduce(function (rows, row, index) {
          const cells = Object.keys(row);
          for (let i = 0; i < cells.length; i++) {
            if (('' + row[cells[i]]).toLowerCase().indexOf(filterStringLower) > -1) {
              rows.push(index);
              break;
            }
          }
          
          return rows;
        }.bind(this), []);

        this.__renderRows();
      },
    };

    return Table;
  })();

  const Column = (function btColumn() {
    function Column(table, id, data) {
      const defaults = {
        style: '',
        cellStyle: '',
        width: null,
        minWidth: null,
        order: 1,
        sort: 'none',
      };

      this.settings = extend(defaults, data.props);

      this.table = table;
      this.name = data.name;
      this.data = data;
      this.id = id;
      this.cells = [];
      this.dragging = false;

      this.__order = this.settings.order;
      this.__sort = 'none';

      this.onClick = new Event();
      this.onDoubleClick = new Event();
      this.onDragStart = new Event();
      this.onDragStop = new Event();

      this.$el = null;
      this.$headerEl = null;

      this.__init();

      this.sort = this.settings.sort;
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

        const $sortEl = document.createElement('i');
        $sortEl.className = 'btf-column-sort none ' + this.table.settings.customSortClass;

        $headerEl.appendChild($sortEl);

        $headerEl.onclick = (function () {
          this.onClick.dispatch(this);
          this.table.onColumnClick.dispatch(this);
        }).bind(this);

        $headerEl.ondblclick = (function () {
          this.onDoubleClick.dispatch(this);
          this.table.onColumnDoubleClick.dispatch(this);
        }).bind(this);

        if (this.table.settings.columnsDraggable) {
          let clicking = false;
          let dragging = false;
          let dragDebounce = null;

          $headerEl.onmousedown = (function () {
            clicking = true;
            if (dragDebounce) {
              clearTimeout(dragDebounce);
            }

            dragDebounce = setTimeout(function () {
              if (clicking) {
                dragging = true;
              }
            }, 50);
          });

          $headerEl.onmousemove = (function (e) {
            if (dragging && clicking) {
              clicking = false;
              const $dragger = this.__drag(e);
              this.onDragStart.dispatch([$dragger]);
            }
          }.bind(this));

          $headerEl.onmouseup = (function () {
            clicking = false;
          });
        }

        this.$el = $columnEl;
        this.$sortEl = $sortEl;
        this.$headerEl = $headerEl;

        this.order = this.__order;
      },
      __render: function() {

      },
      __drag: function(e) {
        const $dragger = this.$headerEl.cloneNode(true);
        $dragger.className += ' drag-element';
        document.body.appendChild($dragger);

        const bounds = this.$headerEl.getBoundingClientRect();
        const offsetX = bounds.top + window.scrollY;
        const offsetY = bounds.left + window.scrollX;

        $dragger.style.top = (e.clientY - offsetY) + 'px';
        $dragger.style.left = (e.clientX - offsetX) + 'px';
        $dragger.style.width = this.$headerEl.clientWidth + 'px';

        document.onmousemove = (function(e) {
          $dragger.focus();
          $dragger.style.top = (e.clientY - offsetY) + 'px';
          $dragger.style.left = (e.clientX - offsetX) + 'px';
        });

        document.onmouseup = (function () {
          document.body.removeChild($dragger);
          document.onmouseup = null;
          document.onmousemove = null;
        });

        return $dragger;
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
      get order() {
        return this.__order;
      },
      set order(index) {
        this.__order = index;
        this.$headerEl.style.order = index;
        this.$el.style.order = index;
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
        this.$sortEl.className = 'btf-column-sort ' + val + ' ' + this.table.settings.customSortClass;

        if (this.table.settings.useNativeSorting) { // Native sorting
          this.table.__sortRows(this.id, this.__sort);
        }
      }
    };

    return Column;
  })();

  const Row = (function btRow() {
    function Row(table, data, index) {
      this.table = table;
      this.cells = {};
      this.index = index;
      this.data = data;
      this.hovered = false;
      this.__processed = false;
    }

    Row.prototype = {
      __render: function () {
        if (!this.__proccessed) {
          this.__proccessed = true;
          for (let i = 0; i < this.table.__columnsOrdered.length; i++) {
            const cell = this.cells[this.table.__columnsOrdered[i]];
            cell.__render();
            cell.$el.setAttribute('data-row', this.index);
            // cell.$el.setAttribute('data-row-odd', this.index % 2 === 1);
          }
        }
      },
      __hover: function() {
        for (let i = 0; i < this.table.__columnsOrdered.length; i++) {
          const cell = this.cells[this.table.__columnsOrdered[i]];
          cell.$el.setAttribute('data-hovered', true);
        }
        this.hovered = true;
      },
      __unhover: function () {
        for (let i = 0; i < this.table.__columnsOrdered.length; i++) {
          const cell = this.cells[this.table.__columnsOrdered[i]];
          cell.$el.setAttribute('data-hovered', false);
        }
        this.hovered = false;
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

          $cellEl.onmouseover = (function () {
            this.row.__hover();
          }).bind(this);

          $cellEl.onmouseout = (function () {
            this.row.__unhover();
          }).bind(this);

          this.$el = $cellEl;
        }
      },
    };

    return Cell;
  })();

  const Event = (function eventObject() {
    function Event() {
      this.__listeners = [];
    }

    Event.prototype = {
      dispatch: function (args) { // Triggers the event causing all listener actions to fire.
        for (let i = 0; i < this.__listeners.length; i++) {
          this.__listeners[i].execute(args);
        }
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
    var extended = {};
    var prop;
    for (prop in extendsFrom) {
      if (Object.prototype.hasOwnProperty.call(extendsFrom, prop)) {
        extended[prop] = extendsFrom[prop];
      }
    }
    for (prop in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        extended[prop] = obj[prop];
      }
    }
    return extended;
  };

  function quickSort(arr, leftPos, rightPos, arrLength, compare) {
    let initialLeftPos = leftPos;
    let initialRightPos = rightPos;
    let direction = true;
    let pivot = rightPos;
    while ((leftPos - rightPos) < 0) {
      if (direction) {
        if (compare(arr[pivot], arr[leftPos]) > 0) {
          quickSortSwap(arr, pivot, leftPos);
          pivot = leftPos;
          rightPos--;
          direction = !direction;
        } else
          leftPos++;
      } else {
        if (compare(arr[pivot], arr[rightPos]) > 0) {
          rightPos--;
        } else {
          quickSortSwap(arr, pivot, rightPos);
          leftPos++;
          pivot = rightPos;
          direction = !direction;
        }
      }
    }
    if (pivot - 1 > initialLeftPos) {
      quickSort(arr, initialLeftPos, pivot - 1, arrLength, compare);
    }
    if (pivot + 1 < initialRightPos) {
      quickSort(arr, pivot + 1, initialRightPos, arrLength, compare);
    }
  }

  function quickSortSwap(arr, el1, el2) {
    let swapedElem = arr[el1];
    arr[el1] = arr[el2];
    arr[el2] = swapedElem;
  }

  // BetterTable library objects
  BetterTableLibrary.Table = Table;
  BetterTableLibrary.Row = Row;
  BetterTableLibrary.Column = Column;
  BetterTableLibrary.Cell = Cell;

  return BetterTableLibrary;
})();
