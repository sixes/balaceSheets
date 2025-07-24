
import React, { useMemo, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './BankSheet.css'; // Reuse BankSheet CSS for consistent styling

type Props = {
  name: string;
  data: any;
  onChange: (data: any) => void;
  allSheets: any;
  setAllSheets: (data: any) => void;
  settings: any;
  setSettings: (s: any) => void;
};

export default function SalesSheet({ name, data, onChange, settings, setSettings }: Props) {
  const gridRef = useRef<any>(null);

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

  // Clear grid focus on mount
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.stopEditing();
      gridRef.current.api.clearFocusedCell();
      console.log('Grid focus and editing cleared for SalesSheet');
    }
    return () => {
      if (gridRef.current?.api) {
        gridRef.current.api.stopEditing();
        gridRef.current.api.clearFocusedCell();
        console.log('Grid cleaned up for SalesSheet');
      }
    };
  }, []);

  const columns = useMemo(
    () => [
      { headerName: '序 號', field: 'no', width: 80, editable: false },
      { headerName: '日  期', field: 'date', width: 120, editable: true },
      { headerName: '對方科目', field: 'subject', width: 120, editable: true },
      { headerName: '摘   要', field: 'desc', width: 120, editable: true },
      { headerName: '發票號碼', field: 'invoice', width: 120, editable: true },
      {
        headerName: '貸     方',
        field: 'credit',
        width: 120,
        editable: true,
        valueFormatter: (params: any) => (params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : ''),
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
      no: row.no || index + 1,
      id: row.id || `sales-row-${index + 1}`,
    }));

    const creditSum = calculatedRows.reduce((sum, row) => sum + sanitizeNumber(row.credit), 0);
    const balanceSum = calculatedRows.reduce((sum, row) => sum + sanitizeNumber(row.balance), 0);

    const exchangeRate = sanitizeNumber(settings.exchangeRates?.['HSBC-HKD'] || '1.00');

    const pinnedBottomRow = [
      {
        no: '',
        date: '',
        subject: '',
        desc: 'HKD Total',
        invoice: '',
        credit: formatNumber(creditSum, true),
        balance: formatNumber(balanceSum, true),
        id: 'summary-row-hkd',
      },
      {
        no: '',
        date: '',
        subject: '',
        desc: 'HKD Total (Converted)',
        invoice: '',
        credit: formatNumber(creditSum * exchangeRate, true),
        balance: formatNumber(balanceSum, true),
        id: 'summary-row-converted',
      },
    ];

    console.log('SalesSheet rows:', calculatedRows);
    console.log('SalesSheet pinnedBottomRow:', pinnedBottomRow);

    return { rows: calculatedRows, pinnedBottomRow };
  }, [data?.rows, settings.exchangeRates]);

  return (
    <div className="custom-grid-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="sticky-title">
        <div>
          銷   貨
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
              newRows[params.node.rowIndex] = {
                ...params.data,
                balance: formatNumber(sanitizeNumber(params.data.credit) * sanitizeNumber(settings.exchangeRates?.['HSBC-HKD'] || '1.00')),
              };
              const newData = { ...data, rows: newRows };
              console.log('SalesSheet onChange:', newData);
              onChange(newData);
              if (gridRef.current?.api) {
                gridRef.current.api.stopEditing(false);
                gridRef.current.api.clearFocusedCell();
              }
            }}
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
          />
        </div>
      </div>
    </div>
  );
}
