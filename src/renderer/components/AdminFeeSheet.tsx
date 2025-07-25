import React, { useMemo, useEffect, useRef } from 'react';
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
        field: 'cellRef', 
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
        headerName: '科   目', 
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
        headerName: '貸     方',
        field: 'credit',
        flex: 1,
        minWidth: 120,
        editable: true,
        valueFormatter: (params: any) => (params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : '0.00'),
      },
      {
        headerName: '借或贷',
        field: 'debitOrCredit',
        flex: 1,
        minWidth: 100,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['', '借', '贷'] },
        valueFormatter: (params) => params.value || ''
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
  }, [data?.rows, pinnedBottomRow, name]);

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
    color: 'black',
    borderBottom: '1px solid #aaa',
    height: '70px',
    fontSize: '14px',
  });

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
        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>管  理 費</div>
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
                  color: 'black',
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
          />
        </div>
      </div>
    </div>
  );
}