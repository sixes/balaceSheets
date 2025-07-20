import React, { useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import './BankSheet.css' // Import custom styles

type Props = {
  name: string
  data: any
  onChange: (data: any) => void
  allSheets: any
  setAllSheets: (data: any) => void
  settings: any
  setSettings: (s: any) => void
}

export default function BankSheet({ name, data, onChange, allSheets, setAllSheets, settings, setSettings }: Props) {
  const gridRef = useRef<any>(null) // Reference to the grid

  const columns = useMemo(() => [
    { headerName: '序 號', field: 'cellRef', width: 80, editable: false }, // First column for row index
    { headerName: '日  期', field: 'date', width: 120, editable: true },
    { headerName: '對方科目', field: 'subject', width: 120, editable: true },
    { headerName: '摘   要', field: 'desc', width: 120, editable: true },
    { headerName: '借     方', field: 'debit', width: 120, editable: true },
    { headerName: '貸     方', field: 'credit', width: 120, editable: true },
    { headerName: '餘    額', field: 'balance', width: 120, editable: true },
    { headerName: '發票號碼', field: 'invoice', width: 120, editable: true } // New column for invoice number
  ], [])

  const rows = Array.isArray(data.rows) && data.rows.length > 0 
    ? data.rows.map((row, index) => ({ ...row, cellRef: index + 1 })) // Use integer for row index
    : [
        { cellRef: 1, date: '上年餘額', subject: '', desc: '', debit: '', credit: '', balance: '', invoice: '' }, // First row with "上年餘額"
        ...Array(9).fill({ cellRef: '', date: '', subject: '', desc: '', debit: '', credit: '', balance: '', invoice: '' }).map((row, index) => ({
          ...row,
          cellRef: index + 2
        }))
      ]

  const handleCellValueChanged = (params: any) => {
    const updatedRows = rows.map((row, index) =>
      index === params.node.rowIndex ? { ...row, [params.column.colId]: params.newValue } : row
    )
    if (params.node.rowIndex === rows.length - 1) {
      const newRows = Array(10).fill({ cellRef: '', date: '', subject: '', desc: '', debit: '', credit: '', balance: '', invoice: '' }).map((row, index) => ({
        ...row,
        cellRef: rows.length + index + 1
      }))
      updatedRows.push(...newRows)

      // Maintain scroll position
      setTimeout(() => {
        gridRef.current?.api?.ensureIndexVisible(rows.length) // Ensure the newly added row is visible
      }, 0)
    }
    onChange({ ...data, rows: updatedRows })
  }

  const handleGridReady = (params: any) => {
    gridRef.current = params // Store grid reference
    params.api.sizeColumnsToFit() // Auto-resize columns to fit the grid width
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <div>銀 行 存 款</div>
        <div>
          公司名稱: <input
            value={settings.companyName || ''}
            onChange={e => setSettings({ ...settings, companyName: e.target.value })}
            style={{ width: 120 }}
          />
          &nbsp;&nbsp;{name}
        </div>
        <div>
          會計期間：<input
            value={settings.period || ''}
            onChange={e => setSettings({ ...settings, period: e.target.value })}
            style={{ width: 120 }}
          />
          &nbsp;&nbsp;賬號：<input
            value={data.account || ''}
            onChange={e => onChange({ ...data, account: e.target.value })}
            style={{ width: 120 }}
          />
        </div>
      </div>
      <div className="ag-theme-alpine custom-grid" style={{ height: 400, width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          columnDefs={columns}
          onCellValueChanged={handleCellValueChanged}
          defaultColDef={{ editable: true, resizable: true }}
          onGridReady={handleGridReady}
          enableRangeSelection={true} // Enable range selection for copy/paste
          enableClipboard={true} // Enable clipboard functionality for direct copy-paste
          processCellForClipboard={(params) => params.value} // Process cell value for copying
          processCellFromClipboard={(params) => params.value} // Process cell value for pasting
        />
      </div>
    </div>
  )
}