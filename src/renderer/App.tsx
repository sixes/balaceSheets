import React, { useEffect, useState, useRef, useCallback } from 'react';
import SheetTabs from './components/SheetTabs';
import BankSheet from './components/BankSheet';
import SalesSheet from './components/SalesSheet';
import CostSheet from './components/CostSheet';
import FeeSheet from './components/FeeSheet';
import InterestSheet from './components/InterestSheet';
import PayableSheet from './components/PayableSheet';
import DirectorSheet from './components/DirectorSheet';
import CapitalSheet from './components/CapitalSheet';
import AdminFeeSheet from './components/AdminFeeSheet';
import AuthDialog from './components/AuthDialog';
import { exportAllSheets } from './utils/exportExcel';

const defaultSheets = [
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
  { name: '股本', type: 'capital' },
];

const defaultBankRows = Array(50).fill(null).map((_, index) => ({
  cellRef: index + 1,
  date: '',
  subject: '',
  desc: '',
  debit: '',
  credit: '',
  balance: '',
  invoice: '',
  id: `row-${index + 1}`,
}));

const defaultNonBankRows = Array(50).fill(null).map((_, index) => ({
  no: index + 1,
  date: '',
  subject: '',
  desc: '',
  invoice: '',
  credit: '',
  debit: '',
  balance: '',
  id: `row-${index + 1}`,
}));

const defaultCapitalRows = Array(50).fill(null).map((_, index) => ({
  no: index + 1,
  date: '',
  subject: '',
  desc: '',
  invoice: '',
  debit: '',
  balance: '',
  id: `row-${index + 1}`,
}));

const defaultAdminFeeRows = Array(50).fill(null).map((_, index) => ({
  cellRef: index + 1,
  date: '',
  subject: '',
  desc: '',
  invoice: '',
  debit: '',
  credit: '',
  debitOrCredit: '',
  balance: '',
  id: `row-${index + 1}`,
}));

const defaultExchangeRates = {
  'HSBC-USD': '7.79',
  'HSBC-HKD': '1.00',
  'HSBC-CAD': '5.65',
  'HSBC-RMB': '1.08',
};

export default function App() {
  const [sheets, setSheets] = useState(defaultSheets);
  const [activeSheet, setActiveSheet] = useState(sheets[0].name);
  const [sheetData, setSheetData] = useState<any>(
    sheets.reduce(
      (acc, sheet) => ({
        ...acc,
        [sheet.name]: sheet.type === 'bank' ? { rows: defaultBankRows, account: '' } : { rows: [], account: '' },
      }),
      {}
    )
  );
  const [settings, setSettings] = useState<any>({
    exchangeRates: defaultExchangeRates,
    companyName: '',
    period: '',
  });
  const [authed, setAuthed] = useState(true);
  const [newSheetSelection, setNewSheetSelection] = useState('');
  const [customSheetName, setCustomSheetName] = useState('');
  const [newSheetError, setNewSheetError] = useState('');
  const bankSheetRef = useRef<{ saveCurrentEdit: () => void } | null>(null);

  const sanitizeNumber = (value: any): number => {
    if (typeof value === 'string') {
      const isNegative = (value.startsWith('(') && value.endsWith(')')) || value.startsWith('-');
      const cleanValue = value.replace(/[,]/g, '').replace(/[\(\)-]/g, '');
      const parsedValue = parseFloat(cleanValue) || 0;
      return isNegative ? -parsedValue : parsedValue;
    }
    return parseFloat(value) || 0;
  };

  const formatNumber = (value: number, isPinned: boolean = false): string => {
    if (isNaN(value)) return '';
    const absValue = Math.abs(value);
    const formatted = absValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return isPinned && value < 0 ? `(${formatted})` : formatted;
  };

  useEffect(() => {
    window.electronAPI
      .loadData()
      .then((data: any) => {
        console.log('Loaded sheetData:', data);
        if (data) {
          const loadedSheets = Object.keys(data).filter((name) => data[name].rows.length > 0 || data[name].account);
          const predefinedTypes: { [key: string]: string } = {
            '商业登记书': 'registration',
            '秘书费': 'secretary',
            '工资': 'salary',
            '审计费': 'audit',
          };
          const mergedSheets = [...defaultSheets];
          loadedSheets.forEach((name) => {
            if (!mergedSheets.some((sheet) => sheet.name === name)) {
              const sheetType = name.includes('-') ? 'bank' : predefinedTypes[name] || 'other';
              mergedSheets.push({ name, type: sheetType });
            }
          });
          setSheets(mergedSheets);
          const mergedData = mergedSheets.reduce(
            (acc, sheet) => ({
              ...acc,
              [sheet.name]: {
                rows: data[sheet.name]?.rows?.length > 0 ? data[sheet.name].rows : sheet.type === 'bank' ? defaultBankRows : [],
                account: data[sheet.name]?.account || '',
              },
            }),
            {}
          );
          console.log('Merged sheetData:', mergedData);
          setSheetData(mergedData);
        }
      })
      .catch((error: any) => {
        console.error('Failed to load sheetData:', error);
      });
    window.electronAPI
      .loadSettings()
      .then((data: any) => {
        console.log('Loaded settings:', data);
        if (data) {
          setSettings({
            ...data,
            exchangeRates: {
              ...defaultExchangeRates,
              ...data.exchangeRates,
            },
          });
        }
      })
      .catch((error: any) => {
        console.error('Failed to load settings:', error);
      });
  }, []);

  useEffect(() => {
    if (authed) {
      console.log('Saving sheetData:', sheetData);
      window.electronAPI.saveData(sheetData).catch((error: any) => {
        console.error('Failed to save sheetData:', error);
      });
    }
  }, [sheetData, authed]);

  useEffect(() => {
    if (authed) {
      console.log('Saving settings:', settings);
      window.electronAPI.saveSettings(settings).catch((error: any) => {
        console.error('Failed to save settings:', error);
      });
    }
  }, [settings, authed]);

  useEffect(() => {
    console.log('Switched to sheet:', activeSheet, 'Data:', sheetData[activeSheet], 'ExchangeRate:', settings.exchangeRates[activeSheet]);
  }, [activeSheet, sheetData, settings.exchangeRates]);

  const addSheet = () => {
    let sheetName = newSheetSelection === 'custom' ? customSheetName : newSheetSelection;
    if (!sheetName) {
      setNewSheetError('Please select or enter a sheet name');
      return;
    }
    if (sheets.some((sheet) => sheet.name === sheetName)) {
      setNewSheetError('Sheet name already exists');
      return;
    }

    let sheetType: string;
    let rowsData: any[] = [];

    if (newSheetSelection === 'custom') {
      if (!sheetName.includes('-')) {
        setNewSheetError('Bank sheet name must be in format BankName-Currency (e.g., ICBC-USD)');
        return;
      }
      const currency = sheetName.split('-')[1]?.toUpperCase();
      if (!currency || currency.length < 2) {
        setNewSheetError('Invalid currency in bank sheet name');
        return;
      }
      sheetType = 'bank';
      rowsData = defaultBankRows;
    } else {
      const predefinedTypes: { [key: string]: string } = {
        '商业登记书': 'registration',
        '秘书费': 'secretary',
        '工资': 'salary',
        '审计费': 'audit',
      };
      sheetType = predefinedTypes[sheetName];
      if (!sheetType) {
        setNewSheetError('Invalid sheet type selected');
        return;
      }
      rowsData = defaultAdminFeeRows;
    }

    const newSheet = { name: sheetName, type: sheetType };
    const newSheets = [...sheets, newSheet];
    const newSheetData = {
      ...sheetData,
      [sheetName]: { rows: rowsData, account: '' },
    };
    const newExchangeRates = newSheetSelection === 'custom' ? {
      ...settings.exchangeRates,
      [sheetName]: '1.00',
    } : settings.exchangeRates;

    setSheets(newSheets);
    setSheetData(newSheetData);
    setSettings({ ...settings, exchangeRates: newExchangeRates });
    setActiveSheet(sheetName);
    setNewSheetSelection('');
    setCustomSheetName('');
    setNewSheetError('');
    console.log('Added new sheet:', sheetName, 'Type:', sheetType, 'Sheets:', newSheets, 'SheetData:', newSheetData);
  };

  const handleDeleteSheet = (sheetName: string) => {
    const sheet = sheets.find((s) => s.name === sheetName);
    if (!sheet || sheet.type !== 'bank') {
      console.log(`Cannot delete sheet ${sheetName}: not a bank sheet or not found`);
      return;
    }

    const newSheets = sheets.filter((s) => s.name !== sheetName);
    if (newSheets.length === 0) {
      setNewSheetError('Cannot delete the last sheet');
      return;
    }

    const newSheetData = { ...sheetData };
    delete newSheetData[sheetName];

    const newExchangeRates = { ...settings.exchangeRates };
    delete newExchangeRates[sheetName];

    setSheets(newSheets);
    setSheetData(newSheetData);
    setSettings({ ...settings, exchangeRates: newExchangeRates });

    if (activeSheet === sheetName) {
      setActiveSheet(newSheets[0].name);
    }

    console.log(`Deleted bank sheet ${sheetName}, new sheets:`, newSheets, 'new sheetData:', newSheetData);
  };

  const handleSheetSwitch = useCallback(
    (sheetName: string) => {
      console.log('Switching to sheet:', sheetName);
      if (bankSheetRef.current && sheets.find((s) => s.name === activeSheet)?.type === 'bank') {
        bankSheetRef.current.saveCurrentEdit();
      }

      if (['銷售收入', '銷售成本', '銀行費用', '利息收入', '應付費用', '董事往來'].includes(sheetName)) {
        const sheetConfig = {
          '銷售收入': { subjects: ['销售收入'], sourceField: 'debit', targetField: 'credit', rows: defaultNonBankRows },
          '銷售成本': { subjects: ['销售成本'], sourceField: 'credit', targetField: 'debit', rows: defaultNonBankRows },
          '銀行費用': { subjects: ['银行费用'], sourceField: 'credit', targetField: 'debit', rows: defaultNonBankRows },
          '利息收入': { subjects: ['利息收入'], sourceField: 'debit', targetField: 'credit', rows: defaultNonBankRows },
          '應付費用': { subjects: ['董事往來', '股東往來'], sourceField: 'credit', targetField: 'debit', rows: defaultNonBankRows },
          '董事往來': { subjects: ['董事往来'], sourceField: 'credit', targetField: 'debit', rows: defaultNonBankRows },
          '股本': { subjects: ['股本'], sourceField: 'credit', targetField: 'debit', rows: defaultCapitalRows },
        };
        const { subjects, sourceField, targetField, rows } = sheetConfig[sheetName];
        setSheetData((prev: any) => {
          const clearedData = { rows: rows, account: prev[sheetName]?.account || '' };
          console.log(`Cleared ${sheetName} data:`, clearedData);
          const bankSheets = Object.keys(prev).filter((name) => sheets.find((s) => s.name === name)?.type === 'bank');
          let targetRows: any[] = [];
          bankSheets.forEach((bankSheetName) => {
            const exchangeRate = sanitizeNumber(settings.exchangeRates?.[bankSheetName] || '1.00');
            console.log(`Processing bank sheet: ${bankSheetName}, exchangeRate: ${exchangeRate}`);
            const rows = prev[bankSheetName]?.rows || [];
            rows.forEach((row: any, index: number) => {
              if (subjects.includes(row.subject) && row[sourceField]) {
                console.log(`Found ${row.subject} row in ${bankSheetName}:`, row);
                targetRows.push({
                  no: 0,
                  date: row.date || '',
                  subject: bankSheetName,
                  desc: row.desc || '',
                  invoice: row.invoice || '',
                  [targetField]: row[sourceField],
                  balance: sheetName === '銀行費用' ? '' : formatNumber(sanitizeNumber(row[sourceField]) * exchangeRate),
                  id: `${sheetName === '銷售收入' ? 'sales' : sheetName === '銷售成本' ? 'cost' : sheetName === '銀行費用' ? 'fee' : sheetName === '利息收入' ? 'interest' : sheetName === '應付費用' ? 'payable' : sheetName === '董事往來' ? 'director' : 'capital'}-row-${bankSheetName}-${index}`,
                });
              }
            });
          });

          targetRows.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateA - dateB;
          });

          targetRows = targetRows.map((row, index) => ({
            ...row,
            no: index + 1,
          }));

          console.log(`Populated ${sheetName} rows:`, targetRows);
          return {
            ...prev,
            [sheetName]: { ...clearedData, rows: targetRows },
          };
        });
      }

      setActiveSheet(sheetName);
      setSheetData((prev: any) => {
        if (!prev[sheetName]) {
          console.log('Initializing data for sheet:', sheetName);
          const sheetType = sheets.find((s) => s.name === sheetName)?.type;
          const defaultRows = sheetType === 'bank' ? defaultBankRows :
                             sheetType === 'capital' ? defaultCapitalRows :
                             sheetType === 'registration' || sheetType === 'secretary' || 
                             sheetType === 'salary' || sheetType === 'audit' ? defaultAdminFeeRows :
                             defaultNonBankRows;
          return {
            ...prev,
            [sheetName]: {
              rows: defaultRows,
              account: '',
            },
          };
        }
        console.log('Sheet data exists:', prev[sheetName]);
        return prev;
      });
    },
    [sheets, activeSheet, settings.exchangeRates, bankSheetRef]
  );

  return (
    <div style={{ 
      height: '100vh',
      overflow: 'hidden',
      display: 'flex', 
      flexDirection: 'column', 
      margin: 0, 
      padding: 0,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      minWidth: '100%',
      flex: 1
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '2px 4px', 
        height: '40px', 
        flexShrink: 0, 
        lineHeight: '32px',
        borderBottom: '1px solid #ccc',
        backgroundColor: '#f5f5f5',
        zIndex: 10
      }}>
        <SheetTabs sheets={sheets} active={activeSheet} onSelect={handleSheetSwitch} onDelete={handleDeleteSheet} />
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <select
            value={newSheetSelection}
            onChange={(e) => {
              setNewSheetSelection(e.target.value);
              if (e.target.value !== 'custom') {
                setCustomSheetName('');
              }
            }}
            style={{ width: '120px', height: '24px', fontSize: '12px', marginRight: '4px' }}
          >
            <option value="">Select Sheet Type</option>
            <option value="商业登记书">商业登记书</option>
            <option value="秘书费">秘书费</option>
            <option value="工资">工资</option>
            <option value="审计费">审计费</option>
            <option value="custom">Custom Bank Sheet</option>
          </select>
          {newSheetSelection === 'custom' && (
            <input
              value={customSheetName}
              onChange={(e) => setCustomSheetName(e.target.value)}
              placeholder="BankName-Currency (e.g., ICBC-USD)"
              style={{ width: '120px', height: '24px', fontSize: '12px', marginRight: '4px' }}
            />
          )}
          <button style={{ height: '24px', fontSize: '12px', padding: '0 8px' }} onClick={addSheet}>
            Add Sheet
          </button>
          <button style={{ height: '24px', fontSize: '12px', padding: '0 8px', marginLeft: '4px' }} onClick={() => exportAllSheets(sheetData)}>
            導出Excel
          </button>
        </div>
      </div>
      
      {newSheetError && (
        <div style={{ 
          color: 'red', 
          fontSize: '12px', 
          padding: '2px 4px', 
          flexShrink: 0,
          backgroundColor: '#fff8f8'
        }}>
          {newSheetError}
        </div>
      )}
      
      <div style={{ 
        flex: 1, 
        position: 'relative',
        overflow: 'hidden',
        minHeight: 0,
        minWidth: '100%'
      }}>
        {(() => {
          const props = {
            name: activeSheet,
            data: sheetData[activeSheet] || { rows: [], account: '' },
            onChange: (data: any) =>
              setSheetData((prev: any) => {
                const newData = { ...prev, [activeSheet]: { ...data } };
                console.log('Updated sheetData for', activeSheet, ':', newData);
                return newData;
              }),
            allSheets: sheetData,
            setAllSheets: setSheetData,
            settings,
            setSettings,
          };
          const sheetType = sheets.find((s) => s.name === activeSheet)?.type;
          console.log('Rendering sheet:', activeSheet, 'Type:', sheetType, 'Sheets:', sheets, 'Props:', props);
          switch (sheetType) {
            case 'bank':
              return <BankSheet {...props} ref={bankSheetRef} />;
            case 'sales':
              return <SalesSheet {...props} />;
            case 'cost':
              return <CostSheet {...props} />;
            case 'fee':
              return <FeeSheet {...props} />;
            case 'interest':
              return <InterestSheet {...props} />;
            case 'payable':
              return <PayableSheet {...props} />;
            case 'director':
              return <DirectorSheet {...props} />;
            case 'capital':
              return <CapitalSheet {...props} />;
            case 'registration':
            case 'secretary':
            case 'salary':
            case 'audit':
              return <AdminFeeSheet {...props} ref={React.createRef()} />;
            default:
              console.error('No matching sheet type for:', activeSheet, 'Available sheets:', sheets);
              return <div>No sheet found for {activeSheet}. Please check sheet configuration.</div>;
          }
        })()}
      </div>
    </div>
  );
}