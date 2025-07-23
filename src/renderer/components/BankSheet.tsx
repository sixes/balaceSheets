import React, { useMemo, useRef, useCallback, useState } from 'react'
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
  const [selectedNodes, setSelectedNodes] = useState<any[]>([]);

  const formatNumber = (value: number, isPinned: boolean = false): string => {
    if (isNaN(value)) return ''
    const absValue = Math.abs(value)
    const formatted = absValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return isPinned && value < 0 ? `(${formatted})` : formatted
  }

  const sanitizeNumber = (value: any): number => {
    if (typeof value === 'string') {
      const isNegative = value.startsWith('(') && value.endsWith(')') || value.startsWith('-')
      const cleanValue = value.replace(/[,]/g, '').replace(/[\(\)-]/g, '')
      const parsedValue = parseFloat(cleanValue) || 0
      return isNegative ? -parsedValue : parsedValue
    }
    return parseFloat(value) || 0
  }

  const columns = useMemo(() => [
    { headerName: '序 號', field: 'cellRef', width: 80, editable: false, valueFormatter: params => params.value || '' },
    { headerName: '日  期', field: 'date', width: 120, editable: true },
    { headerName: '對方科目', field: 'subject', width: 120, editable: true },
    { headerName: '摘   要', field: 'desc', width: 120, editable: true },
    { 
      headerName: '借     方', 
      field: 'debit', 
      width: 120, 
      editable: true,
      valueFormatter: params => params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : ''
    },
    { 
      headerName: '貸     方', 
      field: 'credit', 
      width: 120, 
      editable: true,
      valueFormatter: params => params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : ''
    },
    {
      headerName: '餘    額',
      field: 'balance',
      width: 120,
      editable: params => params.node.rowIndex === 0,
      valueGetter: params => params.data.balance,
      valueSetter: params => {
        if (params.node.rowIndex === 0) {
          params.data.balance = params.newValue
          return true
        }
        return false
      },
      valueFormatter: params => params.value ? formatNumber(sanitizeNumber(params.value), params.node?.rowPinned) : ''
    },
    { headerName: '發票號碼', field: 'invoice', width: 120, editable: true }
  ], [])

  const defaultColDef = useMemo(() => ({
    editable: true,
    resizable: true,
    suppressSizeToFit: true, // Add this to prevent columns from auto-resizing
  }), [])

  // Add Row Below the Last Selected Row (or at end if none)
  const addRow = useCallback(() => {
    const rowsArray = Array.isArray(data.rows) ? data.rows : []
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || []
    let insertIndex = rowsArray.length
    if (selectedNodes.length > 0) {
      const sortedIndexes = selectedNodes.map(n => n.rowIndex).sort((a,b) => a-b)
      insertIndex = sortedIndexes[sortedIndexes.length -1] + 1
    }
    const previousBalance = insertIndex > 0 ? sanitizeNumber(rowsArray[insertIndex - 1]?.balance || '0.00') : 0

    const newRow = {
      cellRef: insertIndex + 1,
      date: '',
      subject: '',
      desc: '',
      debit: '',
      credit: '',
      balance: formatNumber(previousBalance),
      invoice: '',
      id: `row-${rowsArray.length + 1}`
    }
    const updatedRows = [...rowsArray]
    updatedRows.splice(insertIndex, 0, newRow)

    let runningBalance = sanitizeNumber(updatedRows[0]?.balance || '0.00')
    const recalculatedRows = updatedRows.map((row, index) => {
      if (index === 0) {
        return { ...row, cellRef: 1, balance: formatNumber(runningBalance), id: `row-${index + 1}` }
      }
      const debit = sanitizeNumber(row.debit)
      const credit = sanitizeNumber(row.credit)
      const balance = runningBalance + debit - credit
      runningBalance = balance
      return { ...row, cellRef: index + 1, balance: formatNumber(balance), id: `row-${index + 1}` }
    })

    onChange({ ...data, rows: recalculatedRows })
  }, [data, onChange, sanitizeNumber, formatNumber])

  const deleteSelectedRows = useCallback(() => {
    const rowsArray = Array.isArray(data.rows) ? data.rows : []
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || []
    if (rowsArray.length <= 1) return

    const selectedRowIds = new Set(selectedNodes.map(node => node.data.id))
    const updatedRows = rowsArray.filter(row => !selectedRowIds.has(row.id))
    if (updatedRows.length === 0) return

    let previousBalance = sanitizeNumber(updatedRows[0]?.balance || '0.00')
    const recalculatedRows = updatedRows.map((row, index) => {
      if (index === 0) {
        return { ...row, cellRef: 1, balance: formatNumber(previousBalance), id: `row-${index + 1}` }
      }
      const debit = sanitizeNumber(row.debit)
      const credit = sanitizeNumber(row.credit)
      const balance = previousBalance + debit - credit
      previousBalance = balance
      return { ...row, cellRef: index + 1, balance: formatNumber(balance), id: `row-${index + 1}` }
    })

    onChange({ ...data, rows: recalculatedRows })
  }, [data, onChange, sanitizeNumber, formatNumber])

  const getContextMenuItems = useCallback((params: any) => {
    if (params.node?.rowPinned) {
      return []
    }
    return [
      {
        name: 'Add Row',
        action: () => addRow()
      },
      {
        name: 'Delete Selected Rows',
        action: () => deleteSelectedRows(),
        disabled: !data?.rows || data.rows.length <= 1 || !gridRef.current?.api.getSelectedNodes().length
      },
      'separator',
      'copy',
      'paste'
    ]
  }, [addRow, deleteSelectedRows, data])

  const handleCellContextMenu = useCallback((params: any) => {
    if (!params.node?.rowPinned) {
      gridRef.current?.api.showContextMenu(params)
    }
  }, [])

  const { rows, pinnedBottomRow } = useMemo(() => {
    const rowsArray = Array.isArray(data?.rows) ? data.rows : []
    const inputRows = rowsArray.length > 0
      ? rowsArray.map((row, index) => ({ ...row, cellRef: index + 1, id: `row-${index + 1}` }))
      : [
          { cellRef: 1, date: '上年餘額', subject: '', desc: '', debit: '', credit: '', balance: '0.00', invoice: '', id: 'row-1' },
          ...Array(9).fill({ cellRef: '', date: '', subject: '', desc: '', debit: '', credit: '', balance: '', invoice: '' }).map((row, index) => ({
            ...row,
            cellRef: index + 2,
            id: `row-${index + 2}`
          }))
        ]

    let previousBalance = sanitizeNumber(inputRows[0].balance)
    const calculatedRows = inputRows.map((row, index) => {
      if (index === 0) {
        return { ...row, balance: formatNumber(previousBalance) }
      }
      const debit = sanitizeNumber(row.debit)
      const credit = sanitizeNumber(row.credit)
      const balance = previousBalance + debit - credit
      previousBalance = balance
      return { ...row, balance: formatNumber(balance) }
    })

    const seenIds = new Set()
    const uniqueRows = calculatedRows.filter(row => {
      if (seenIds.has(row.id)) {
        console.warn(`Duplicate row ID detected: ${row.id}`)
        return false
      }
      seenIds.add(row.id)
      return true
    })

    const debitSum = uniqueRows.reduce((sum, row) => sum + sanitizeNumber(row.debit), 0)
    const creditSum = uniqueRows.reduce((sum, row) => sum + sanitizeNumber(row.credit), 0)
    const balanceSum = debitSum - creditSum

    const exchangeRate = sanitizeNumber(settings.exchangeRate || '7.79')

    const pinnedBottomRow = [
      {
        cellRef: '',
        date: '',
        subject: '',
        desc: 'USD Total',
        debit: formatNumber(debitSum, true),
        credit: formatNumber(creditSum, true),
        balance: formatNumber(balanceSum, true),
        invoice: '',
        id: 'summary-row-usd' // Make sure these IDs are unique
      },
      {
        cellRef: '',
        date: '',
        subject: '',
        desc: 'HKD Total',
        debit: formatNumber(debitSum * exchangeRate, true),
        credit: formatNumber(creditSum * exchangeRate, true),
        balance: formatNumber(balanceSum * exchangeRate, true),
        invoice: '',
        id: 'summary-row-hkd' // Make sure these IDs are unique
      }
    ]

    return { rows: uniqueRows, pinnedBottomRow }
  }, [data?.rows, settings.exchangeRate, sanitizeNumber, formatNumber])

  const handleCellValueChanged = useCallback((params: any) => {
    const api = gridRef.current?.api
    
    // Store column widths before making changes
    const colState = api?.getColumnState()
    const verticalScrollPosition = api?.getVerticalPixelRange()?.top || 0
    const horizontalScrollPosition = api?.getHorizontalPixelRange()?.left || 0
    const editedRowIndex = params.node.rowIndex

    let updatedRows = rows.map((row, index) =>
      index === editedRowIndex ? { ...row, [params.column.colId]: params.newValue } : row
    )

    if (params.column.colId === 'debit' || params.column.colId === 'credit' || (params.column.colId === 'balance' && editedRowIndex === 0)) {
      let previousBalance = sanitizeNumber(updatedRows[0].balance)
      updatedRows = updatedRows.map((row, index) => {
        if (index === 0) {
          return { ...row, balance: formatNumber(previousBalance) }
        }
        const debit = sanitizeNumber(row.debit)
        const credit = sanitizeNumber(row.credit)
        const balance = previousBalance + debit - credit
        previousBalance = balance
        return { ...row, balance: formatNumber(balance) }
      })
    }

    const isLastRow = editedRowIndex === rows.length - 1
    let previousBalance = sanitizeNumber(updatedRows[updatedRows.length - 1].balance)
    if (isLastRow) {
      const newRows = Array(10).fill({ cellRef: '', date: '', subject: '', desc: '', debit: '', credit: '', balance: '', invoice: '' }).map((row, index) => ({
        ...row,
        cellRef: rows.length + index + 1,
        id: `row-${rows.length + index + 1}`,
        balance: formatNumber(previousBalance)
      }))
      updatedRows = [...updatedRows, ...newRows]
    }

    onChange({ ...data, rows: updatedRows })

    // Use setTimeout to ensure UI updates before restoring state
    setTimeout(() => {
      if (api) {
        // First restore column state
        if (colState) api.setColumnState(colState)
        
        // Then restore scroll positions
        api.setVerticalScrollPosition(verticalScrollPosition)
        api.setHorizontalScrollPosition(horizontalScrollPosition)
        
        // Finally ensure the edited row is visible
        api.ensureIndexVisible(editedRowIndex, 'middle')
      }
    }, 0)
  }, [data, rows, onChange, sanitizeNumber, formatNumber])

  const handleGridReady = useCallback((params: any) => {
    gridRef.current = params
    const api = params.api
    
    // Store the initial column state after sizing
    api.sizeColumnsToFit()
    const initialColState = api.getColumnState()
    
    // Add window resize handler to adjust columns AND grid size
    const handleResize = () => {
      if (api) {
        // Explicitly call resizeToFit first
        params.api.sizeColumnsToFit()
        
        // Force grid to re-render with new container size
        setTimeout(() => {
          // This will force the grid to refresh its size
          api.doLayout()
        }, 0)
      }
    }
    
    // Clean up previous listeners if any
    window.removeEventListener('resize', handleResize)
    window.addEventListener('resize', handleResize)
    
    // Add row selection listener
    api.addEventListener('rowSelected', () => {
      const selected = api.getSelectedNodes() || [];
      setSelectedNodes([...selected]); // Create new array to force re-render
    });
    
  }, [])

  return (
    <div className="custom-grid-container" style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden'
    }}>
      {/* Header section - will not scroll */}
      <div className="sticky-title">
        <div style={{ fontSize: '1.2em', fontWeight: 'bold', marginBottom: '8px' }}>
          銀 行 存 款 - {name}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '4px' }}>
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
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            賬號：<input
              value={data?.account || ''}
              onChange={e => onChange({ ...data, account: e.target.value })}
              style={{ width: 120 }}
            />
          </div>
          <div>
            USD:HKD = <input
              value={settings.exchangeRate}
              onChange={e => setSettings({ ...settings, exchangeRate: e.target.value })}
              style={{ width: 80 }}
            />
          </div>
        </div>
      </div>

      {/* Add/Delete buttons - will not scroll */}
      <div className="button-container">
        <button onClick={addRow}>Add Row</button>
        <button
          onClick={deleteSelectedRows}
          disabled={
            !Array.isArray(data?.rows) || 
            (data?.rows?.length || 0) <= 1 || 
            selectedNodes.length === 0
          }
          style={{ marginLeft: 8 }}
        >
          Delete Selected Rows
        </button>
      </div>

      {/* AG Grid container - only this will scroll */}
      <div className="grid-wrapper">
        <div className="ag-theme-alpine custom-grid">
          <AgGridReact
            ref={gridRef}
            rowData={rows}
            pinnedBottomRowData={pinnedBottomRow}
            columnDefs={columns}
            defaultColDef={defaultColDef} // Use the defaultColDef variable
            onCellValueChanged={handleCellValueChanged}
            onCellContextMenu={handleCellContextMenu}
            onGridReady={handleGridReady}
            onRowSelected={(event) => {
              const selected = gridRef.current?.api?.getSelectedNodes() || [];
              setSelectedNodes(selected);
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
            rowHeight={25}
            pinnedRowHeight={35}
            domLayout="normal"
            rowSelection="multiple"
            getContextMenuItems={getContextMenuItems}
            suppressAutoSize={true}
            suppressHorizontalScroll={false}
            suppressColumnVirtualisation={false}
            suppressRowVirtualisation={false}
            alwaysShowHorizontalScroll={false}
            alwaysShowVerticalScroll={false}
            autoSizePinned={false}
          />
        </div>
      </div>
    </div>
  )
}
