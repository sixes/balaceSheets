import React from 'react'
import { AgGridReact } from 'ag-grid-react'

type Props = {
  name: string
  data: any
  onChange: (data: any) => void
  allSheets: any
  setAllSheets: (data: any) => void
  settings: any
  setSettings: (s: any) => void
}

export default function SalesSheet({ data, onChange, settings, setSettings }: Props) {
  const columns = [
    { headerName: '序 號', field: 'no', width: 80 },
    { headerName: '日  期', field: 'date', width: 120 },
    { headerName: '對方科目', field: 'subject', width: 120 },
    { headerName: '摘   要', field: 'desc', width: 120 },
    { headerName: '發票號碼', field: 'invoice', width: 120 },
    { headerName: '貸     方', field: 'credit', width: 120, editable: true },
    { headerName: '餘    額', field: 'balance', width: 120 }
  ]
  const rows = data.rows || []

  return (
    <div>
      <div>銷   貨</div>
      <div>
        公司名稱: <input
          value={settings.companyName || ''}
          onChange={e => setSettings({ ...settings, companyName: e.target.value })}
          style={{ width: 120 }}
        />
      </div>
      <div>
        會計期間：<input
          value={settings.period || ''}
          onChange={e => setSettings({ ...settings, period: e.target.value })}
          style={{ width: 120 }}
        />
      </div>
      <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
        <AgGridReact
          rowData={rows}
          columnDefs={columns}
          onCellValueChanged={params => {
            const newRows = [...rows]
            newRows[params.node.rowIndex] = params.data
            onChange({ ...data, rows: newRows })
          }}
          defaultColDef={{ editable: true, resizable: true }}
        />
      </div>
      {/* TODO: Add summary rows */}
    </div>
  )
}