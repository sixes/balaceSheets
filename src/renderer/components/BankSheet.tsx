import React, { useMemo, useRef, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './BankSheet.css';

type Props = {
  name: string;
  data: any;
  onChange: (data: any) => void;
  allSheets: any;
  setAllSheets: (data: any) => void;
  settings: any;
  setSettings: (s: any) => void;
};

const BankSheet = forwardRef(({ name, data, onChange, allSheets, setAllSheets, settings, setSettings }: Props, ref) => {
  const gridRef = useRef<any>(null);
  const [gridReady, setGridReady] = useState(false);
  const [selectedRowsCount, setSelectedRowsCount] = useState(0);
  const [currentEdit, setCurrentEdit] = useState<{ rowIndex: number; colId: string; value: any } | null>(null);

  const currency = name.split('-')[1] || 'USD';

  // Expose saveCurrentEdit to parent via ref
  useImperativeHandle(ref, () => ({
    saveCurrentEdit: () => {
      if (currentEdit && gridRef.current?.api) {
        console.log('Saving current edit:', currentEdit);
        const { rowIndex, colId, value } = currentEdit;
        const updatedRows = (data.rows || []).map((row: any, index: number) =>
          index === rowIndex ? { ...row, [colId]: value } : row
        );

        let previousBalance = sanitizeNumber(updatedRows[0]?.balance || '0.00');
        const recalculatedRows = updatedRows.map((row: any, index: number) => {
          if (index === 0) {
            return { ...row, balance: formatNumber(previousBalance) };
          }
          const debit = sanitizeNumber(row.debit);
          const credit = sanitizeNumber(row.credit);
          const balance = previousBalance + debit - credit;
          previousBalance = balance;
          return { ...row, balance: formatNumber(balance) };
        });

        const newData = { ...data, rows: recalculatedRows };
        console.log('saveCurrentEdit onChange:', newData);
        onChange(newData);
        gridRef.current.api.stopEditing();
        gridRef.current.api.clearFocusedCell();
        setCurrentEdit(null);
      }
    },
  }));

  // Clear grid focus and editing state on mount
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.stopEditing();
      gridRef.current.api.clearFocusedCell();
      console.log(`Grid focus and editing cleared for sheet: ${name}`);
    }
    return () => {
      if (gridRef.current?.api) {
        gridRef.current.api.stopEditing();
        gridRef.current.api.clearFocusedCell();
        console.log(`Grid cleaned up for sheet: ${name}`);
      }
    };
  }, [name]);

  const formatNumber = (value: number, isPinned: boolean = false): string => {
    if (isNaN(value)) return '';
    const absValue = Math.abs(value);
    const formatted = absValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return isPinned && value < 0 ? `(${formatted})` : formatted;
  };

  const sanitizeNumber = (value: any): number => {
    if (typeof value === 'string') {
      const isNegative = (value.startsWith('(') && value.endsWith(')')) || value.startsWith('-');
      const cleanValue = value.replace(/[,]/g, '').replace(/[\(\)-]/g, '');
      const parsedValue = parseFloat(cleanValue) || 0;
      return isNegative ? -parsedValue : parsedValue;
    }
    return parseFloat(value) || 0;
  };

  const columns = useMemo(
    () => [
      { headerName: '序 號', field: 'cellRef', width: 80, editable: false, valueFormatter: (params) => params.value || '' },
      { headerName: '日  期', field: 'date', width: 120, editable: true },
      { headerName: '對方科目', field: 'subject', width: 120, editable: true },
      { headerName: '摘   要', field: 'desc', width: 120, editable: true },
      {
        headerName: '借     方',
        field: 'debit',
        width: 120,
        editable: true,
        valueFormatter: (params) => (params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : ''),
      },
      {
        headerName: '貸     方',
        field: 'credit',
        width: 120,
        editable: true,
        valueFormatter: (params) => (params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : ''),
      },
      {
        headerName: '餘    額',
        field: 'balance',
        width: 120,
        editable: (params) => params.node.rowIndex === 0,
        valueGetter: (params) => params.data.balance,
        valueSetter: (params) => {
          if (params.node.rowIndex === 0) {
            params.data.balance = params.newValue;
            return true;
          }
          return false;
        },
        valueFormatter: (params) => (params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : ''),
      },
      { headerName: '發票號碼', field: 'invoice', width: 120, editable: true },
    ],
    []
  );

  const addRow = useCallback(() => {
    const rowsArray = Array.isArray(data.rows) ? data.rows : [];
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    let insertIndex = rowsArray.length;
    if (selectedNodes.length > 0) {
      const sortedIndexes = selectedNodes.map((n) => n.rowIndex).sort((a, b) => a - b);
      insertIndex = sortedIndexes[sortedIndexes.length - 1] + 1;
    }
    const previousBalance = insertIndex > 0 ? sanitizeNumber(rowsArray[insertIndex - 1]?.balance || '0.00') : 0;

    const newRow = {
      cellRef: insertIndex + 1,
      date: '',
      subject: '',
      desc: '',
      debit: '',
      credit: '',
      balance: formatNumber(previousBalance),
      invoice: '',
      id: `row-${rowsArray.length + 1}`,
    };
    const updatedRows = [...rowsArray];
    updatedRows.splice(insertIndex, 0, newRow);

    let runningBalance = sanitizeNumber(updatedRows[0]?.balance || '0.00');
    const recalculatedRows = updatedRows.map((row, index) => {
      if (index === 0) {
        return { ...row, cellRef: 1, balance: formatNumber(runningBalance), id: `row-${index + 1}` };
      }
      const debit = sanitizeNumber(row.debit);
      const credit = sanitizeNumber(row.credit);
      const balance = runningBalance + debit - credit;
      runningBalance = balance;
      return { ...row, cellRef: index + 1, balance: formatNumber(balance), id: `row-${index + 1}` };
    });

    console.log('addRow onChange:', { ...data, rows: recalculatedRows });
    onChange({ ...data, rows: recalculatedRows });
  }, [data, onChange, sanitizeNumber, formatNumber]);

  const deleteSelectedRows = useCallback(() => {
    const rowsArray = Array.isArray(data.rows) ? data.rows : [];
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    if (rowsArray.length <= 1) return;

    const selectedRowIds = new Set(selectedNodes.map((node) => node.data.id));
    const updatedRows = rowsArray.filter((row) => !selectedRowIds.has(row.id));
    if (updatedRows.length === 0) return;

    let previousBalance = sanitizeNumber(updatedRows[0]?.balance || '0.00');
    const recalculatedRows = updatedRows.map((row, index) => {
      if (index === 0) {
        return { ...row, cellRef: 1, balance: formatNumber(previousBalance), id: `row-${index + 1}` };
      }
      const debit = sanitizeNumber(row.debit);
      const credit = sanitizeNumber(row.credit);
      const balance = previousBalance + debit - credit;
      previousBalance = balance;
      return { ...row, cellRef: index + 1, balance: formatNumber(balance), id: `row-${index + 1}` };
    });

    console.log('deleteSelectedRows onChange:', { ...data, rows: recalculatedRows });
    onChange({ ...data, rows: recalculatedRows });
    setSelectedRowsCount(0);
  }, [data, onChange, sanitizeNumber, formatNumber]);

  const getContextMenuItems = useCallback(
    (params: any) => {
      console.log('Context menu triggered', { params, data });
      if (params.node?.rowPinned) {
        return [];
      }
      return [
        {
          name: 'Add Row',
          action: () => {
            console.log('Add Row clicked');
            addRow();
          },
        },
        {
          name: 'Delete Selected Rows',
          action: () => {
            console.log('Delete Selected Rows clicked');
            deleteSelectedRows();
          },
          disabled: !data?.rows || data.rows.length <= 1 || !gridRef.current?.api.getSelectedNodes().length,
        },
        'separator',
        'copy',
        'paste',
      ];
    },
    [addRow, deleteSelectedRows, data]
  );

  const handleCellContextMenu = useCallback((params: any) => {
    console.log('Cell context menu event', params);
    if (!params.node?.rowPinned) {
      gridRef.current?.api.showContextMenu(params);
    }
  }, []);

  const handleSelectionChanged = useCallback(() => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    setSelectedRowsCount(selectedNodes.length);
  }, []);

  const { rows, pinnedBottomRow } = useMemo(() => {
    const rowsArray = Array.isArray(data?.rows) ? data.rows : [];
    const inputRows =
      rowsArray.length > 0
        ? rowsArray.map((row, index) => ({ ...row, cellRef: index + 1, id: `row-${index + 1}` }))
        : [
            { cellRef: 1, date: '上年餘額', subject: '', desc: '', debit: '', credit: '', balance: '0.00', invoice: '', id: 'row-1' },
            ...Array(9)
              .fill({ cellRef: '', date: '', subject: '', desc: '', debit: '', credit: '', balance: '', invoice: '' })
              .map((row, index) => ({
                ...row,
                cellRef: index + 2,
                id: `row-${index + 2}`,
              })),
          ];

    let previousBalance = sanitizeNumber(inputRows[0].balance);
    const calculatedRows = inputRows.map((row, index) => {
      if (index === 0) {
        return { ...row, balance: formatNumber(previousBalance) };
      }
      const debit = sanitizeNumber(row.debit);
      const credit = sanitizeNumber(row.credit);
      const balance = previousBalance + debit - credit;
      previousBalance = balance;
      return { ...row, balance: formatNumber(balance) };
    });

    const seenIds = new Set();
    const uniqueRows = calculatedRows.filter((row) => {
      if (seenIds.has(row.id)) {
        console.warn(`Duplicate row ID detected: ${row.id}`);
        return false;
      }
      seenIds.add(row.id);
      return true;
    });

    // Calculate sums for pinned rows
    const debitSum = uniqueRows.reduce((sum, row) => sum + sanitizeNumber(row.debit), 0);
    const creditSum = uniqueRows.reduce((sum, row) => sum + sanitizeNumber(row.credit), 0);
    const balanceSum = debitSum - creditSum;
    const exchangeRate = sanitizeNumber(settings.exchangeRates?.[name] || '1.00');

    // Create pinnedBottomRow data
    const pinnedBottom = [
      {
        cellRef: 'T1',
        date: 'Total',
        subject: '',
        desc: `${currency} Total`,
        debit: formatNumber(debitSum, true),
        credit: formatNumber(creditSum, true),
        balance: formatNumber(balanceSum, true),
        invoice: 'SUM',
        id: 'pinned-currency-total',
      },
      {
        cellRef: 'T2',
        date: 'Total',
        subject: '',
        desc: 'HKD Total',
        debit: formatNumber(debitSum * exchangeRate, true),
        credit: formatNumber(creditSum * exchangeRate, true),
        balance: formatNumber(balanceSum * exchangeRate, true),
        invoice: 'HKD',
        id: 'pinned-hkd-total',
      },
    ];

    console.log(`Sheet ${name} rows:`, uniqueRows);
    console.log(`Sheet ${name} pinned rows:`, pinnedBottom);

    return { rows: uniqueRows, pinnedBottomRow: pinnedBottom };
  }, [data?.rows, name, sanitizeNumber, formatNumber, settings.exchangeRates, currency]);

  useEffect(() => {
    // Debug the pinned row data
    console.log('Pinned Bottom Row Data:', rows);

    if (gridRef.current?.api) {
      const pinnedNodes = gridRef.current.api.getPinnedBottomRow();
      console.log('Pinned Bottom Row Nodes:', pinnedNodes);
    }
  }, [rows, gridRef.current?.api]);

  const handleCellValueChanged = useCallback(
    (params: any) => {
      const api = gridRef.current?.api;
      const colState = api?.getColumnState();
      const verticalScrollPosition = api?.getVerticalPixelRange()?.top || 0;
      const horizontalScrollPosition = api?.getHorizontalPixelRange()?.left || 0;
      const editedRowIndex = params.node.rowIndex;

      // Capture the in-progress edit value
      setCurrentEdit({
        rowIndex: editedRowIndex,
        colId: params.column.colId,
        value: params.newValue,
      });

      // Commit the edit to sheetData
      let updatedRows = rows.map((row, index) => (index === editedRowIndex ? { ...row, [params.column.colId]: params.newValue } : row));

      if (params.column.colId === 'debit' || params.column.colId === 'credit' || (params.column.colId === 'balance' && editedRowIndex === 0)) {
        let previousBalance = sanitizeNumber(updatedRows[0].balance);
        updatedRows = updatedRows.map((row, index) => {
          if (index === 0) {
            return { ...row, balance: formatNumber(previousBalance) };
          }
          const debit = sanitizeNumber(row.debit);
          const credit = sanitizeNumber(row.credit);
          const balance = previousBalance + debit - credit;
          previousBalance = balance;
          return { ...row, balance: formatNumber(balance) };
        });
      }

      const isLastRow = editedRowIndex === rows.length - 1;
      let previousBalance = sanitizeNumber(updatedRows[updatedRows.length - 1].balance);
      if (isLastRow) {
        const newRows = Array(10)
          .fill({ cellRef: '', date: '', subject: '', desc: '', debit: '', credit: '', balance: '', invoice: '' })
          .map((row, index) => ({
            ...row,
            cellRef: rows.length + index + 1,
            id: `row-${rows.length + index + 1}`,
            balance: formatNumber(previousBalance),
          }));
        updatedRows = [...updatedRows, ...newRows];
      }

      const newData = { ...data, rows: updatedRows };
      console.log('handleCellValueChanged onChange:', newData);
      onChange(newData);

      if (api) {
        api.stopEditing(false); // Keep editing active to allow further input
        api.clearFocusedCell();
        if (colState) api.setColumnState(colState);
        api.setVerticalScrollPosition(verticalScrollPosition);
        api.setHorizontalPixelRange(horizontalScrollPosition);
        api.ensureIndexVisible(editedRowIndex, 'middle');
      }
    },
    [data, rows, onChange, sanitizeNumber, formatNumber]
  );

  const handleGridReady = useCallback((params: any) => {
    gridRef.current = params;
    setGridReady(true);
    
    // Initial column sizing
    setTimeout(() => {
      params.api.sizeColumnsToFit();
      
      // Ensure all columns are visible
      const allColumnIds = params.columnApi.getAllColumns().map(column => column.getId());
      params.columnApi.autoSizeColumns(allColumnIds);
      
      // Now size to fit after ensuring all columns have proper width
      setTimeout(() => {
        params.api.sizeColumnsToFit();
        params.api.doLayout();
      }, 50);
    }, 0);
  }, []);

  const onGridSizeChanged = useCallback((params) => {
    // Resize columns when grid size changes
    params.api.sizeColumnsToFit();
  }, []);

  const getPinnedRowStyle = useCallback(() => {
    return {
      fontWeight: 'bold',
      backgroundColor: '#e8e8e8',
      color: '#000',
      borderBottom: '1px solid #aaa',
      height: '50px',
      fontSize: '14px',
    };
  }, []);

  return (
    <div
      className="custom-grid-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header section - will not scroll */}
      <div className="sticky-title" style={{ flex: '0 0 auto' }}>
        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>銀 行 存 款 - {name}</div>
        <div>
          公司名稱:{' '}
          <input
            value={settings.companyName || ''}
            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
            style={{ width: 120 }}
          />
          會計期間：
          <input
            value={settings.period || ''}
            onChange={(e) => setSettings({ ...settings, period: e.target.value })}
            style={{ width: 120 }}
          />
          賬號：
          <input
            value={data?.account || ''}
            onChange={(e) => {
              const newData = { ...data, account: e.target.value };
              onChange(newData);
            }}
            style={{ width: 120 }}
          />
          {name.includes('-') && (
            <>
              {name.split('-')[1]}:HKD ={' '}
              <input
                value={settings.exchangeRates?.[name] || '1.00'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    exchangeRates: { ...settings.exchangeRates, [name]: e.target.value },
                  })
                }
                style={{ width: 80 }}
              />
            </>
          )}
        </div>
      </div>

      {/* Button row */}
      <div style={{ flex: '0 0 auto', padding: '4px 8px' }}>
        <button onClick={addRow} style={{ marginRight: '8px' }}>
          Add Row
        </button>
        <button
          onClick={deleteSelectedRows}
          disabled={!Array.isArray(data?.rows) || data?.rows?.length <= 1 || selectedRowsCount === 0}
        >
          Delete Selected Rows
        </button>
      </div>

      {/* AG Grid - fills remaining space with internal scrolling */}
      <div
        style={{
          flex: '1 1 auto',
          position: 'relative',
          minHeight: 0, // Important for flex containers
        }}
      >
        <div
          className="ag-theme-alpine custom-grid"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <AgGridReact
            ref={gridRef}
            rowData={rows}
            pinnedBottomRowData={pinnedBottomRow}
            columnDefs={columns}
            defaultColDef={{
              editable: true,
              resizable: true,
              suppressSizeToFit: false, // Let columns be sized to fit
              minWidth: 80, // Add minimum width to prevent columns from disappearing
            }}
            onGridReady={handleGridReady}
            onCellValueChanged={handleCellValueChanged}
            onCellContextMenu={handleCellContextMenu}
            onRowSelected={handleSelectionChanged}
            enableClipboard={true}
            processCellForClipboard={(params) => params.value}
            processCellFromClipboard={(params) => params.value}
            suppressScrollOnNewData={true}
            deltaRowDataMode={true}
            getRowId={(params) => params.data.id}
            suppressMoveWhenRowDragging={true}
            suppressFocusAfterRefresh={true}
            headerHeight={30}
            rowHeight={25}
            pinnedRowHeight={70} // Increased from 35 to 50
            domLayout="normal"
            rowSelection="multiple"
            getContextMenuItems={getContextMenuItems}
            getRowStyle={(params) => {
              if (params.node.rowPinned) {
                return getPinnedRowStyle();
              }
              return null;
            }}
            suppressColumnVirtualisation={true}
            suppressRowVirtualisation={true}
            suppressNoRowsOverlay={true}
            cellStyle={(params) => {
              if (params.node.rowPinned) {
                return {
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'visible',
                  backgroundColor: '#e8e8e8',
                  fontWeight: 'bold',
                  color: '#000',
                };
              }
              return {
                display: 'flex',
                alignItems: 'center',
                overflow: 'visible',
              };
            }}
            onFirstDataRendered={(params) => {
              // Fix for pinned rows display after first render
              setTimeout(() => {
                params.api.sizeColumnsToFit();
                const pinnedNodes = params.api.getPinnedBottomRow();
                console.log('After sizing - Pinned Bottom Rows:', pinnedNodes);
              }, 100);
            }}
            onGridSizeChanged={onGridSizeChanged}
          />
        </div>
      </div>
    </div>
  );
});

export default BankSheet;
