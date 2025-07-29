import React, { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './CapitalSheet.css';

type Props = {
  name: string;
  data: any;
  onChange: (data: any) => void;
  allSheets: any;
  setAllSheets: (data: any) => void;
  settings: any;
  setSettings: (s: any) => void;
};

export default function CapitalSheet({ name, data, onChange, settings, setSettings }: Props) {
  const gridRef = useRef<any>(null);
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
    if (isNaN(value) || value === null || value === undefined) return '0.00';
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
      { 
        headerName: '序 號', 
        field: 'no', 
        width: 80, 
        editable: false,
        valueFormatter: (params) => params.value || ''
      },
      { 
        headerName: '日  期', 
        field: 'date', 
        flex: 1, 
        minWidth: 120, 
        editable: true,
        valueFormatter: (params) => params.value || ''
      },
      { 
        headerName: '對方科目', 
        field: 'subject', 
        flex: 1, 
        minWidth: 120, 
        editable: true,
        valueFormatter: (params) => params.value || ''
      },
      { 
        headerName: '摘   要', 
        field: 'desc', 
        flex: 1, 
        minWidth: 120, 
        editable: true,
        valueFormatter: (params) => params.value || ''
      },
      { 
        headerName: '發票號碼', 
        field: 'invoice', 
        flex: 1, 
        minWidth: 120, 
        editable: true,
        valueFormatter: (params) => params.value || ''
      },
      {
        headerName: '借     方',
        field: 'debit',
        flex: 1,
        minWidth: 120,
        editable: true,
        valueFormatter: (params: any) => (params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : '0.00'),
      },
      {
        headerName: '餘    額',
        field: 'balance',
        flex: 1,
        minWidth: 120,
        editable: false,
        valueFormatter: (params: any) => (params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : '0.00'),
      },
      { field: 'id', hide: true }, // Prevent "Invalid number"
    ],
    []
  );

  const { rows, pinnedBottomRow } = useMemo(() => {
    const rowsArray = Array.isArray(data?.rows) ? data.rows : [];
    const calculatedRows = rowsArray.map((row, index) => ({
      ...row,
      no: row.no || index + 1,
      id: row.id || `${name}-row-${index + 1}`,
      balance: formatNumber(
        sanitizeNumber(row.debit) * sanitizeNumber(settings.exchangeRates?.['HSBC-HKD'] || '1.00'),
        false
      ),
    }));

    const debitSum = calculatedRows.reduce((sum, row) => sum + sanitizeNumber(row.debit), 0);
    const balanceSum = calculatedRows.reduce((sum, row) => sum + sanitizeNumber(row.balance), 0);
    const exchangeRate = sanitizeNumber(settings.exchangeRates?.['HSBC-HKD'] || '1.00');

    const pinnedBottomRow = [
      {
        no: '',
        date: '',
        subject: '',
        desc: 'HKD Total',
        invoice: '',
        debit: formatNumber(debitSum, true),
        balance: formatNumber(balanceSum, true),
        id: 'summary-row-hkd',
      },
      {
        no: '',
        date: '',
        subject: '',
        desc: 'HKD Total (Converted)',
        invoice: '',
        debit: formatNumber(debitSum * exchangeRate, true),
        balance: formatNumber(balanceSum * exchangeRate, true),
        id: 'summary-row-converted',
      },
    ];

    console.log(`${name} rows:`, calculatedRows);
    console.log(`${name} pinnedBottomRow:`, pinnedBottomRow);

    return { rows: calculatedRows, pinnedBottomRow };
  }, [data?.rows, settings.exchangeRates, name, sanitizeNumber, formatNumber]);

  useEffect(() => {
    if (gridRef.current?.api && data?.rows) {
      gridRef.current.api.setGridOption('pinnedBottomRowData', pinnedBottomRow);
      gridRef.current.api.redrawRows();
      console.log(`Set pinned bottom rows for ${name}:`, pinnedBottomRow);
    }
  }, [pinnedBottomRow, data?.rows, name]);

  const handleGridReady = (params: any) => {
    gridRef.current = params;
    params.api.resetColumnState(); // Ensure id is hidden
    params.api.setGridOption('pinnedBottomRowData', pinnedBottomRow);
    params.api.sizeColumnsToFit();
    params.api.redrawRows();
    console.log(`Grid ready for ${name}, columns sized, pinned rows set:`, pinnedBottomRow);
  };

  const getPinnedRowStyle = () => ({
    fontWeight: 'bold',
    backgroundColor: '#e8e8e8',
    color: '#000',
    borderBottom: '1px solid #aaa',
    height: '70px',
    fontSize: '14px',
  });

  const addRow = useCallback(() => {
    const rows = data?.rows || [];
    const lastRow = rows.length > 0 ? rows[rows.length - 1] : null;
    const newRow = {
      no: lastRow ? Number(lastRow.no || 0) + 1 : 1,
      date: '',
      subject: '',
      desc: '',
      invoice: '',
      debit: '',
      balance: '',
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    onChange({
      ...data,
      rows: [...(data?.rows || []), newRow],
    });
  }, [data, onChange]);

  const deleteSelectedRows = useCallback(() => {
    if (!gridRef.current?.api) return;
    
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    if (selectedNodes.length === 0) return;
    
    const selectedIds = selectedNodes.map((node: any) => node.data.id);
    const newRows = data.rows.filter((row: any) => !selectedIds.includes(row.id));
    
    // Recalculate no values to be sequential
    const updatedRows = newRows.map((row: any, index: number) => ({
      ...row,
      no: index + 1,
    }));
    
    onChange({
      ...data,
      rows: updatedRows,
    });
    
    setSelectedRowsCount(0);
  }, [data, onChange]);

  const handleSelectionChanged = useCallback(() => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || [];
    setSelectedRowsCount(selectedNodes.length);
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
      <div className="sticky-title" style={{ flex: '0 0 auto' }}>
        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>資 本</div>
        <div>
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
        </div>
      </div>
      {/* Add and Delete buttons */}
      <div style={{ flex: '0 0 auto', padding: '4px 8px' }}>
        <button onClick={addRow} style={{ marginRight: '8px' }}>
          Add Row
        </button>
        <button
          onClick={deleteSelectedRows}
          disabled={!Array.isArray(data?.rows) || selectedRowsCount === 0}
        >
          Delete Selected Rows
        </button>
      </div>
      <div
        style={{
          flex: '1 1 auto',
          position: 'relative',
          minHeight: 0,
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
              editable: false,
              resizable: true,
              suppressSizeToFit: true,
              minWidth: 80,
            }}
            onGridReady={handleGridReady}
            onCellValueChanged={(params) => {
              const newRows = [...rows];
              const debit = sanitizeNumber(params.data.debit);
              newRows[params.node.rowIndex] = {
                ...params.data,
                balance: formatNumber(debit * sanitizeNumber(settings.exchangeRates?.['HSBC-HKD'] || '1.00')),
              };
              const newData = { ...data, rows: newRows };
              console.log(`${name} onChange:`, newData);
              onChange(newData);
              if (gridRef.current?.api) {
                gridRef.current.api.stopEditing(false);
                gridRef.current.api.clearFocusedCell();
                gridRef.current.api.setGridOption('pinnedBottomRowData', pinnedBottomRow);
                gridRef.current.api.redrawRows();
              }
            }}
            enableClipboard={true}
            processCellForClipboard={(params) => params.value}
            processCellFromClipboard={(params) => params.value}
            suppressScrollOnNewData={true}
            deltaRowDataMode={true}
            getRowId={(params) => params.data.id}
            suppressMoveWhenRowDragging={true}
            suppressFocusAfterRefresh={true}
            headerHeight={30}
            rowHeight={30}
            pinnedRowHeight={70}
            domLayout="normal"
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
            getRowStyle={(params) => {
              if (params.node.rowPinned) {
                return getPinnedRowStyle();
              }
              return null;
            }}
            onFirstDataRendered={(params) => {
              params.api.sizeColumnsToFit();
              params.api.setGridOption('pinnedBottomRowData', pinnedBottomRow);
              params.api.redrawRows();
              console.log(`First data rendered for ${name}, columns sized, pinned rows:`, pinnedBottomRow);
            }}
            onSelectionChanged={handleSelectionChanged}
            rowSelection="multiple"
          />
        </div>
      </div>
    </div>
  );
}