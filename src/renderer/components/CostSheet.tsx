import React, { useMemo, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './CostSheet.css';

type Props = {
  name: string;
  data: any;
  onChange: (data: any) => void;
  allSheets: any;
  setAllSheets: (data: any) => void;
  settings: any;
  setSettings: (s: any) => void;
};

export default function CostSheet({ name, data, onChange, settings, setSettings }: Props) {
  const gridRef = useRef<any>(null);

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

  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.stopEditing();
      gridRef.current.api.clearFocusedCell();
      console.log('Grid focus and editing cleared for CostSheet');
    }
    return () => {
      if (gridRef.current?.api) {
        gridRef.current.api.stopEditing();
        gridRef.current.api.clearFocusedCell();
        console.log('Grid cleaned up for CostSheet');
      }
    };
  }, []);

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
      id: row.id || `cost-row-${index + 1}`,
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

    console.log('CostSheet rows:', calculatedRows);
    console.log('CostSheet pinnedBottomRow:', pinnedBottomRow);

    return { rows: calculatedRows, pinnedBottomRow };
  }, [data?.rows, settings.exchangeRates]);

  useEffect(() => {
    if (gridRef.current?.api && data?.rows) {
      gridRef.current.api.setGridOption('pinnedBottomRowData', pinnedBottomRow);
      gridRef.current.api.redrawRows();
      console.log(`Set pinned bottom rows for CostSheet:`, pinnedBottomRow);
    }
  }, [pinnedBottomRow, data?.rows]);

  const handleGridReady = (params: any) => {
    gridRef.current = params;
    params.api.resetColumnState(); // Ensure id is hidden
    params.api.setGridOption('pinnedBottomRowData', pinnedBottomRow);
    params.api.sizeColumnsToFit();
    params.api.redrawRows();
    console.log(`Grid ready for CostSheet, columns sized, pinned rows set:`, pinnedBottomRow);
  };

  const getPinnedRowStyle = () => ({
    fontWeight: 'bold',
    backgroundColor: '#e8e8e8',
    color: '#000',
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
        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>銷   售   成   本</div>
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
              newRows[params.node.rowIndex] = {
                ...params.data,
                balance: formatNumber(sanitizeNumber(params.data.debit) * sanitizeNumber(settings.exchangeRates?.['HSBC-HKD'] || '1.00')),
              };
              const newData = { ...data, rows: newRows };
              console.log('CostSheet onChange:', newData);
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
              console.log(`First data rendered for CostSheet, columns sized, pinned rows:`, pinnedBottomRow);
            }}
          />
        </div>
      </div>
    </div>
  );
}