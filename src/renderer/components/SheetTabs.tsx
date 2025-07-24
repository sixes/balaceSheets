import React from 'react'

type Props = {
  sheets: { name: string }[]
  active: string
  onSelect: (name: string) => void
}

export default function SheetTabs({ sheets, active, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {sheets.map(sheet => (
        <button
          key={sheet.name}
          style={{
            padding: '8px 16px',
            background: sheet.name === active ? '#1976d2' : '#eee',
            color: sheet.name === active ? '#fff' : '#333',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
          onClick={() => onSelect(sheet.name)}
        >
          {sheet.name}
        </button>
      ))}
    </div>
  )
}