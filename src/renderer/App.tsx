import React, { useEffect, useState } from 'react'
import SheetTabs from './components/SheetTabs'
import BankSheet from './components/BankSheet'
import SalesSheet from './components/SalesSheet'
import CostSheet from './components/CostSheet'
import FeeSheet from './components/FeeSheet'
import InterestSheet from './components/InterestSheet'
import PayableSheet from './components/PayableSheet'
import DirectorSheet from './components/DirectorSheet'
import CapitalSheet from './components/CapitalSheet'
import AuthDialog from './components/AuthDialog'
import { exportAllSheets } from './utils/exportExcel'

const SHEETS = [
  { name: 'HSBC-USD', type: 'bank' },
  { name: 'HSBC-HKD', type: 'bank' },
  { name: 'HSBC-CAD', type: 'bank' },
  { name: 'HSBC-RMB', type: 'bank' },
  { name: '銷售收入', type: 'sales' },
  { name: '銷售成本', type: 'cost' },
  { name: '銀行費用', type: 'fee' },
  { name: '利息收入', type: 'interest' },
  { name: '應付費用', type: 'payable' },
  { name: '董事往來', type: 'director' },
  { name: '股本', type: 'capital' }
]

export default function App() {
  const [activeSheet, setActiveSheet] = useState(SHEETS[0].name)
  const [sheetData, setSheetData] = useState<any>({})
  const [settings, setSettings] = useState<any>({})
  const [authed, setAuthed] = useState(false)

  // Load data/settings on mount
  useEffect(() => {
    window.electronAPI.loadData().then((data: any) => {
      if (data) setSheetData(data)
    })
    window.electronAPI.loadSettings().then((data: any) => {
      if (data) setSettings(data)
    })
  }, [])

  // Auto-save data
  useEffect(() => {
    if (authed) window.electronAPI.saveData(sheetData)
  }, [sheetData, authed])

  // Auto-save settings
  useEffect(() => {
    if (authed) window.electronAPI.saveSettings(settings)
  }, [settings, authed])

  // Time slot check
  const now = new Date()
  const allowed = !settings.timeSlot || (
    now >= new Date(settings.timeSlot.start) &&
    now <= new Date(settings.timeSlot.end)
  )
/*
  if (!authed || !allowed) {
    return <AuthDialog
      settings={settings}
      setSettings={setSettings}
      setAuthed={setAuthed}
    />
  }
*/
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden',  // This is important
      position: 'relative'  // Add this
    }}>
      {/* Fixed navigation bar at the top */}
      <div style={{ 
        flex: '0 0 auto', 
        padding: '8px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #ccc'
      }}>
        <SheetTabs
          sheets={SHEETS}
          active={activeSheet}
          onSelect={setActiveSheet}
        />
        <button onClick={() => exportAllSheets(sheetData)}>導出Excel</button>
      </div>

      {/* Sheet content area - takes remaining space, with position relative for the absolute positioning of sheet components */}
      <div style={{ flex: '1 1 auto', position: 'relative', overflow: 'hidden' }}>
        {(() => {
          const props = {
            name: activeSheet,
            data: sheetData[activeSheet] || {},
            onChange: (data: any) =>
              setSheetData((prev: any) => ({ ...prev, [activeSheet]: data })),
            allSheets: sheetData,
            setAllSheets: setSheetData,
            settings,
            setSettings
          }
          switch (SHEETS.find(s => s.name === activeSheet)?.type) {
            case 'bank': return <BankSheet {...props} />
            case 'sales': return <SalesSheet {...props} />
            case 'cost': return <CostSheet {...props} />
            case 'fee': return <FeeSheet {...props} />
            case 'interest': return <InterestSheet {...props} />
            case 'payable': return <PayableSheet {...props} />
            case 'director': return <DirectorSheet {...props} />
            case 'capital': return <CapitalSheet {...props} />
            default: return null
          }
        })()}
      </div>
    </div>
  )
}