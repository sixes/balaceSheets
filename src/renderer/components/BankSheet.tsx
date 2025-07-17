import React, { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

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
  // Example: You should extend this to match your full requirements
  const columns = useMemo(() => [
    { headerName: '序 號', field: 'no', width: 80 },
    { headerName: '日  期', field: 'date', width: 120 },
    { headerName: '對方科目', field: 'subject', width: 120 },
    { headerName: '摘   要', field: 'desc', width: 120 },
    { headerName: '借     方', field: 'debit', width: 120, editable: true },
    { headerName: '貸     方', field: 'credit', width: 120, editable: true },
    { headerName: '餘    額', field: 'balance', width: 120 },
    { headerName: '餘    額', field: 'balance2', width: 120 }
  ], [])

  const rows = data.rows || []

  // Example: handle cell value change
  const handleCellValueChanged = (params: any) => {
    const newRows = [...rows]
    newRows[params.node.rowIndex] = params.data
    onChange({ ...data, rows: newRows })
    // TODO: trigger cross-sheet updates here
  }

  // Example: fixed header rows
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <div>銀 行 存 款</div>
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
      <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
        <AgGridReact
          rowData={rows}
          columnDefs={columns}
          onCellValueChanged={handleCellValueChanged}
          defaultColDef={{ editable: true, resizable: true }}
        />
      </div>
      {/* TODO: Add summary rows, currency conversion, and bottom notes */}
    </div>
  )
}