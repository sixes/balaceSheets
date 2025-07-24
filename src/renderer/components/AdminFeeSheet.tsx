import React, { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './AdminFeeSheet.css';

type Props = {
  name: string;
  data: any;
  onChange: (data: any) => void;
  allSheets: any;
  setAllSheets: (data: any) => void;
  settings: any;
  setSettings: (s: any) => void;
};

export default function AdminFeeSheet({ name, data, onChange, settings, setSettings }: Props) {
  const gridRef = useRef<any>(null);
  const [gridReady, setGridReady] = useState(false);
  const [selectedRowsCount, setSelectedRowsCount] = useState(0);

  // Initialize data if undefined
  useEffect(() => {
    if (!data || !data.rows) {
      console.log(`Initializing data for ${name}`);
      onChange({ rows: [], account: '' });
    }
  }, [data, name, onChange]);

  // Clear grid focus
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.stopEditing();
      gridRef.current.api.clearFocusedCell();
      console.log(`Grid focus cleared for ${name}`);
    }
    return () => {
      if (gridRef.current?.api) {
        gridRef.current.api.stopEditing();
        gridRef.current.api.clearFocusedCell();
        console.log(`Grid cleaned up for ${name}`);
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

  // Add new row
  const addNewRow = useCallback(() => {
    const rowsArray = Array.isArray(data.rows) ? data.rows : [];
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    let insertIndex = rowsArray.length;
    if (selectedNodes.length > 0) {
      const sortedIndexes = selectedNodes.map((n) => n.rowIndex).sort((a, b) => a - b);
      insertIndex = sortedIndexes[sortedIndexes.length - 1] + 1;
    }

    const newRow = {
      cellRef: insertIndex + 1,
      date: '',
      subject: '',
      desc: '',
      invoice: '',
      debit: '',
      credit: '',
      debitOrCredit: '',
      balance: '',
      id: `${name}-row-${Date.now()}`,
    };
    const updatedRows = [...rowsArray];
    updatedRows.splice(insertIndex, 0, newRow);

    const recalculatedRows = updatedRows.map((row, index) => ({
      ...row,
      cellRef: index + 1,
      id: row.id || `${name}-row-${index + 1}`,
      balance: formatNumber(
        (sanitizeNumber(row.debit) - sanitizeNumber(row.credit)) * sanitizeNumber(settings.exchangeRates?.['HSBC-HKD'] || '1.00'),
        false
      ),
    }));

    const newData = { ...data, rows: recalculatedRows };
    console.log(`Added new row to ${name}:`, newData);
    onChange(newData);
    if (gridRef.current?.api) {
      gridRef.current.api.setRowData(recalculatedRows);
      gridRef.current.api.ensureIndexVisible(insertIndex);
    }
  }, [data, onChange, settings.exchangeRates, name, sanitizeNumber, formatNumber]);

  // Delete selected rows
  const deleteSelectedRows = useCallback(() => {
    const rowsArray = Array.isArray(data.rows) ? data.rows : [];
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    if (rowsArray.length === 0) return;

    const selectedRowIds = new Set(selectedNodes.map((node) => node.data.id));
    const updatedRows = rowsArray.filter((row) => !selectedRowIds.has(row.id));

    const recalculatedRows = updatedRows.map((row, index) => ({
      ...row,
      cellRef: index + 1,
      id: row.id || `${name}-row-${index + 1}`,
      balance: formatNumber(
        (sanitizeNumber(row.debit) - sanitizeNumber(row.credit)) * sanitizeNumber(settings.exchangeRates?.['HSBC-HKD'] || '1.00'),
        false
      ),
    }));

    const newData = { ...data, rows: recalculatedRows };
    console.log(`Deleted selected rows from ${name}:`, newData);
    onChange(newData);
    if (gridRef.current?.api) {
      gridRef.current.api.setRowData(recalculatedRows);
    }
    setSelectedRowsCount(0);
  }, [data, onChange, name, sanitizeNumber, formatNumber, settings.exchangeRates]);

  // Context menu
  const getContextMenuItems = useCallback(
    (params: any) => {
      console.log('Context menu triggered for', name, params);
      if (params.node?.rowPinned) {
        return [];
      }
      return [
        {
          name: 'Add Row',
          action: () => {
            console.log('Add Row clicked for', name);
            addNewRow();
          },
        },
        {
          name: 'Delete Selected Rows',
          action: () => {
            console.log('Delete Selected Rows clicked for', name);
            deleteSelectedRows();
          },
          disabled: !data?.rows || data.rows.length === 0 || !gridRef.current?.api.getSelectedNodes().length,
        },
        'separator',
        'copy',
        'paste',
      ];
    },
    [addNewRow, deleteSelectedRows, data]
  );

  const handleCellContextMenu = useCallback((params: any) => {
    console.log('Cell context menu event for', name, params);
    if (!params.node?.rowPinned) {
      gridRef.current?.api.showContextMenu(params);
    }
  }, []);

  const handleSelectionChanged = useCallback(() => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    setSelectedRowsCount(selectedNodes.length);
  }, []);

  const handleGridReady = useCallback((params: any) => {
    gridRef.current = params;
    setGridReady(true);
    params.api.sizeColumnsToFit();
    params.api.clearFocusedCell();
    console.log(`Grid ready for ${name}`);
  }, [name]);

  const columns = useMemo(
    () => [
      { headerName: '序 號', field: 'cellRef', width: 80, editable: false },
      { headerName: '日  期', field: 'date', width: 120, editable: true },
      { headerName: '科   目', field: 'subject', width: 120, editable: true },
      { headerName: '摘   要', field: 'desc', width: 120, editable: true },
      { headerName: '發票號碼', field: 'invoice', width: 120, editable: true },
      {
        headerName: '借     方',
        field: 'debit',
        width: 120,
        editable: true,
        valueFormatter: (params: any) => (params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : ''),
      },
      {
        headerName: '貸     方',
        field: 'credit',
        width: 120,
        editable: true,
        valueFormatter: (params: any) => (params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : ''),
      },
      {
        headerName: '借或贷',
        field: 'debitOrCredit',
        width: 100,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['', '借', '贷'] },
      },
      {
        headerName: '餘    額',
        field: 'balance',
        width: 120,
        editable: false,
        valueFormatter: (params: any) => (params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : ''),
      },
    ],
    []
  );

  const { rows, pinnedBottomRow } = useMemo(() => {
    const rowsArray = Array.isArray(data?.rows) ? data.rows : [];
    const calculatedRows = rowsArray.map((row, index) => ({
      ...row,
      cellRef: row.cellRef || index + 1,
      id: row.id || `${name}-row-${index + 1}`,
      balance: formatNumber(
        (sanitizeNumber(row.debit) - sanitizeNumber(row.credit)) * sanitizeNumber(settings.exchangeRates?.['HSBC-HKD'] || '1.00'),
        false
      ),
    }));

    const debitSum = calculatedRows.reduce((sum, row) => sum + sanitizeNumber(row.debit), 0);
    const creditSum = calculatedRows.reduce((sum, row) => sum + sanitizeNumber(row.credit), 0);
    const balanceSum = calculatedRows.reduce((sum, row) => sum + sanitizeNumber(row.balance), 0);

    const exchangeRate = sanitizeNumber(settings.exchangeRates?.['HSBC-HKD'] || '1.00');

    const pinnedBottomRow = [
      {
        cellRef: '',
        date: '',
        subject: '',
        desc: 'HKD Total',
        invoice: '',
        debit: formatNumber(debitSum, true),
        credit: formatNumber(creditSum, true),
        debitOrCredit: '',
        balance: formatNumber(balanceSum, true),
        id: 'summary-row-hkd',
      },
      {
        cellRef: '',
        date: '',
        subject: '',
        desc: 'HKD Total (Converted)',
        invoice: '',
        debit: formatNumber(debitSum * exchangeRate, true),
        credit: formatNumber(creditSum * exchangeRate, true),
        debitOrCredit: '',
        balance: formatNumber(balanceSum, true),
        id: 'summary-row-converted',
      },
    ];

    console.log(`${name} rows:`, calculatedRows);
    console.log(`${name} pinnedBottomRow:`, pinnedBottomRow);

    return { rows: calculatedRows, pinnedBottomRow };
  }, [data?.rows, settings.exchangeRates, name, sanitizeNumber, formatNumber]);

  console.log(`Rendering AdminFeeSheet for ${name}, data:`, data, 'rows:', rows, 'gridReady:', gridReady);

  return (
    <div className="custom-grid-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="sticky-title">
        <div>
          {name}
          {' '}
          公司名稱:{' '}
          <input
            value={settings.companyName || ''}
            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
            style={{ width: 120 }}
          />
          {' '}
          會計期間：
          <input
            value={settings.period || ''}
            onChange={(e) => setSettings({ ...settings, period: e.target.value })}
            style={{ width: 120 }}
          />
          {' '}
          賬號：
          <input
            value={data?.account || ''}
            onChange={(e) => {
              const newData = { ...data, account: e.target.value };
              console.log('Account input onChange:', newData);
              onChange(newData);
            }}
            style={{ width: 120 }}
          />
          {' '}
          <button style={{ height: '24px', fontSize: '12px', padding: '0 8px' }} onClick={addNewRow}>
            Add Row
          </button>
          <button
            style={{ height: '24px', fontSize: '12px', padding: '0 8px', marginLeft: '8px' }}
            onClick={deleteSelectedRows}
            disabled={!gridReady || (Array.isArray(data.rows) ? data.rows.length : 0) === 0 || selectedRowsCount === 0}
          >
            Delete Selected Rows
          </button>
        </div>
      </div>
      <div className="grid-wrapper" style={{ flex: 1, overflow: 'auto' }}>
        <div className="ag-theme-alpine custom-grid" style={{ width: '100%', height: 'calc(100vh - 180px)' }}>
          <AgGridReact
            ref={gridRef}
            rowData={rows}
            pinnedBottomRowData={pinnedBottomRow}
            columnDefs={columns}
            onCellValueChanged={(params) => {
              const newRows = [...rows];
              const debit = sanitizeNumber(params.data.debit);
              const credit = sanitizeNumber(params.data.credit);
              const balance = debit - credit;
              newRows[params.node.rowIndex] = {
                ...params.data,
                balance: formatNumber(balance * sanitizeNumber(settings.exchangeRates?.['HSBC-HKD'] || '1.00')),
              };
              const newData = { ...data, rows: newRows };
              console.log(`${name} onChange:`, newData);
              onChange(newData);
              if (gridRef.current?.api) {
                gridRef.current.api.stopEditing(false);
                gridRef.current.api.clearFocusedCell();
              }
            }}
            onCellContextMenu={handleCellContextMenu}
            onSelectionChanged={handleSelectionChanged}
            onGridReady={handleGridReady}
            defaultColDef={{ editable: true, resizable: true }}
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
            pinnedRowHeight={25}
            rowSelection="multiple"
            getContextMenuItems={getContextMenuItems}
          />
        </div>
      </div>
    </div>
  );
}