import React, { useCallback, useMemo, useState, useRef, forwardRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './AdminFeeSheet.css';

const AdminFeeSheet = forwardRef(({ name, onChange, data, allSheets, setAllSheets, settings, setSettings }, ref) => {
  const gridRef = useRef<any>(null);
  const [selectedRowsCount, setSelectedRowsCount] = useState(0);
  const [currentEdit, setCurrentEdit] = useState<any>(null);

  // Format and sanitize number functions
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

  // Function to add a row
  const addRow = useCallback(() => {
    const rows = data?.rows || [];
    const lastRow = rows.length > 0 ? rows[rows.length - 1] : null;
    const newRow = {
      cellRef: lastRow ? Number(lastRow.cellRef || 0) + 1 : 1,
      date: '',
      subject: '',
      desc: '',
      invoice: '',
      debit: '',
      credit: '',
      balance: '',
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    onChange({
      ...data,
      rows: [...(data?.rows || []), newRow],
    });
  }, [data, onChange]);

  // Function to delete selected rows
  const deleteSelectedRows = useCallback(() => {
    if (!gridRef.current?.api) return;
    
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    if (selectedNodes.length === 0) return;
    
    const selectedIds = selectedNodes.map((node: any) => node.data.id);
    const newRows = data.rows.filter((row: any) => !selectedIds.includes(row.id));
    
    // Recalculate cellRef values to be sequential
    const updatedRows = newRows.map((row: any, index: number) => ({
      ...row,
      cellRef: index + 1,
    }));
    
    onChange({
      ...data,
      rows: updatedRows,
    });
    
    setSelectedRowsCount(0);
  }, [data, onChange]);

  // Create rows and pinnedBottomRow with calculations
  const { rows, pinnedBottomRow } = useMemo(() => {
    const uniqueRows = data?.rows || [];
    
    // Calculate sums for debit and credit
    const debitSum = uniqueRows.reduce((sum, row) => sum + sanitizeNumber(row.debit), 0);
    const creditSum = uniqueRows.reduce((sum, row) => sum + sanitizeNumber(row.credit), 0);
    const balanceSum = debitSum - creditSum;
    
    // Create TWO pinnedBottom rows with proper cellRef values
    const pinnedBottom = [
      {
        cellRef: '', // Use empty string instead of 'T1'
        date: '',
        subject: '',
        desc: '合計 (HKD)',
        debit: formatNumber(debitSum, true),
        credit: formatNumber(creditSum, true),
        balance: formatNumber(balanceSum, true),
        invoice: '',
        id: 'pinned-hkd-total',
      },
      {
        cellRef: '', // Use empty string instead of 'T2'
        date: '',
        subject: '',
        desc: '總計',
        debit: formatNumber(debitSum, true),
        credit: formatNumber(creditSum, true),
        balance: formatNumber(balanceSum, true),
        invoice: '',
        id: 'pinned-grand-total',
      }
    ];
    
    return { rows: uniqueRows, pinnedBottomRow: pinnedBottom };
  }, [data?.rows, sanitizeNumber, formatNumber]);

  // Function to handle row selection
  const handleSelectionChanged = useCallback(() => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || [];
    setSelectedRowsCount(selectedNodes.length);
  }, []);

  // Column definitions
  const columns = useMemo(
    () => [
      { 
        headerName: '序 號', 
        field: 'cellRef', 
        width: 80, 
        editable: false,
        valueFormatter: (params) => {
          // Return empty string for pinned rows to avoid "Invalid number"
          if (params.node.rowPinned) {
            return '';
          }
          // For normal rows, just return the value
          return params.value;
        }
      },
      { headerName: '日  期', field: 'date', flex: 1, minWidth: 120, editable: (params) => !params.node.rowPinned },
      { headerName: '對方科目', field: 'subject', flex: 1, minWidth: 120, editable: (params) => !params.node.rowPinned },
      { headerName: '摘   要', field: 'desc', flex: 1, minWidth: 120, editable: (params) => !params.node.rowPinned },
      { headerName: '發票號碼', field: 'invoice', flex: 1, minWidth: 120, editable: (params) => !params.node.rowPinned },
      { 
        headerName: '借     方', 
        field: 'debit', 
        flex: 1, 
        minWidth: 120, 
        editable: (params) => !params.node.rowPinned,
        valueFormatter: (params) => (params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : '0.00'),
      },
      { 
        headerName: '貸     方', 
        field: 'credit', 
        flex: 1, 
        minWidth: 120, 
        editable: (params) => !params.node.rowPinned,
        valueFormatter: (params) => (params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : '0.00'),
      },
      { 
        headerName: '餘    額', 
        field: 'balance', 
        flex: 1, 
        minWidth: 120, 
        editable: (params) => !params.node.rowPinned,
        valueFormatter: (params) => (params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : '0.00'),
      },
    ],
    [formatNumber, sanitizeNumber]
  );

  // Grid ready handler
  const handleGridReady = useCallback((params: any) => {
    gridRef.current = params;
    params.api.sizeColumnsToFit();
  }, []);

  // Handle cell value changed
  const handleCellValueChanged = useCallback(
    (params: any) => {
      const api = gridRef.current?.api;
      const colState = api?.getColumnState();
      const verticalScrollPosition = api?.getVerticalPixelRange()?.top || 0;
      const horizontalScrollPosition = api?.getHorizontalPixelRange()?.left || 0;
      const editedRowIndex = params.node.rowIndex;

      // Update rows
      let updatedRows = rows.map((row, index) => 
        (index === editedRowIndex ? { ...row, [params.column.colId]: params.newValue } : row)
      );

      // Save the changes
      onChange({ ...data, rows: updatedRows });

      // Restore grid state
      setTimeout(() => {
        if (api) {
          if (colState) api.setColumnState(colState);
          api.setVerticalScrollPosition(verticalScrollPosition);
          api.setHorizontalScrollPosition(horizontalScrollPosition);
          api.ensureIndexVisible(editedRowIndex, 'middle');
        }
      }, 0);
    },
    [data, rows, onChange]
  );

  // Handle cell context menu
  const handleCellContextMenu = useCallback((params: any) => {
    // This function handles right-click context menu on cells
    console.log("Cell context menu:", params);
    // You can add custom context menu handling here if needed
  }, []);

  // Context menu items
  const getContextMenuItems = useCallback(
    (params: any) => {
      if (params.node?.rowPinned) {
        return [];
      }
      return [
        {
          name: 'Add Row',
          action: () => {
            addRow();
          },
        },
        {
          name: 'Delete Selected Rows',
          action: () => {
            deleteSelectedRows();
          },
          disabled: !data?.rows || data.rows.length <= 1 || selectedRowsCount === 0,
        },
        'separator',
        'copy',
        'paste',
      ];
    },
    [addRow, deleteSelectedRows, data, selectedRowsCount]
  );

  // Save current edit (for ref)
  React.useImperativeHandle(ref, () => ({
    saveCurrentEdit: () => {
      if (currentEdit) {
        // Implementation if needed
      }
    }
  }));

  return (
    <div
      className="admin-fee-grid-container"
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
        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>
          {name}
        </div>
        <div>
          公司名稱:{' '}
          <input
            value={settings?.companyName || ''}
            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
            style={{ width: 120 }}
          />
          會計期間：{' '}
          <input
            value={settings?.period || ''}
            onChange={(e) => setSettings({ ...settings, period: e.target.value })}
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
          disabled={!Array.isArray(data?.rows) || data?.rows?.length <= 1 || selectedRowsCount === 0}
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
          className="ag-theme-alpine admin-fee-grid"
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
              suppressSizeToFit: false,
              minWidth: 80,
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
            rowHeight={30}
            pinnedRowHeight={50}
            domLayout="normal"
            rowSelection="multiple"
            getContextMenuItems={getContextMenuItems}
            suppressColumnVirtualisation={true}
            suppressRowVirtualisation={true}
            cellStyle={(params) => {
              if (params.node.rowPinned) {
                return {
                  backgroundColor: '#e8e8e8',
                  fontWeight: 'bold',
                  color: '#000'
                };
              }
              return {};
            }}
            onFirstDataRendered={(params) => {
              setTimeout(() => {
                params.api.sizeColumnsToFit();
              }, 100);
            }}
          />
        </div>
      </div>
    </div>
  );
});

export default AdminFeeSheet;