import React from 'react';

type Props = {
  sheets: Array<{ name: string; type: string }>;
  active: string;
  onSelect: (name: string) => void;
  onDelete: (name: string) => void;
};

export default function SheetTabs({ sheets, active, onSelect, onDelete }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {sheets.map((sheet) => (
        <div
          key={sheet.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            backgroundColor: active === sheet.name ? '#0078d4' : '#e0e0e0',
            color: active === sheet.name ? '#fff' : '#000',
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          <span
            onClick={() => onSelect(sheet.name)}
            style={{ marginRight: '8px' }}
          >
            {sheet.name}
          </span>
          {sheet.type === 'bank' && (
            <button
              onClick={() => onDelete(sheet.name)}
              style={{
                background: 'none',
                border: 'none',
                color: active === sheet.name ? '#fff' : '#ff4444',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '0 4px',
              }}
              title="Delete sheet"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}