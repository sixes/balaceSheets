import * as XLSX from 'xlsx'

export function exportAllSheets(sheetData: any) {
  const wb = XLSX.utils.book_new()
  Object.keys(sheetData).forEach(sheetName => {
    const rows = sheetData[sheetName]?.rows || []
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  })
  XLSX.writeFile(wb, 'banknote-data.xlsx')
}