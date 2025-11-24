
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Employee, StoreSchedule, ShiftDefinition, parseShiftCode } from '../types';
import { DEPARTMENTS } from '../constants';

export const exportToExcel = (
  storeName: string,
  employees: Employee[],
  schedule: StoreSchedule,
  dateRange: Date[],
  shiftDefinitions: Record<string, ShiftDefinition>
) => {
  // Split employees by department
  const retailEmps = employees.filter(e => e.department === 'retail');
  const dispensingEmps = employees.filter(e => e.department === 'dispensing');
  
  // Combine with a "Spacer" concept in mind
  // We will insert a blank column between Retail and Dispensing in the generated data
  
  const startDateStr = format(dateRange[0], 'yyyy/MM/dd');
  const endDateStr = format(dateRange[dateRange.length - 1], 'yyyy/MM/dd');

  // 0. Prepare Title Row
  // Title spans across: Date, Weekday, Retail..., Spacer, Dispensing...
  const totalCols = 2 + retailEmps.length + (dispensingEmps.length > 0 ? 1 : 0) + dispensingEmps.length;
  const titleRow = [`${storeName} 排班表 (${startDateStr} - ${endDateStr})`];

  // 1. Prepare Header Row 
  // REMOVED department text from name as requested
  const headerRow = [
    '日期', 
    '星期', 
    ...retailEmps.map(e => e.name), 
    ...(dispensingEmps.length > 0 ? [''] : []), // Spacer Header
    ...dispensingEmps.map(e => e.name)
  ];

  // 2. Prepare Data Rows (Iterate selected Dates)
  const data = [];
  
  for (const date of dateRange) {
    const dateKey = format(date, 'yyyy-MM-dd');
    const displayDate = format(date, 'MM/dd');
    const displayWeekday = format(date, 'EE', { locale: zhTW });

    const row: any[] = [displayDate, displayWeekday];

    // Retail Columns
    retailEmps.forEach(emp => {
      row.push(getCellText(schedule, dateKey, emp.id, shiftDefinitions));
    });

    // Spacer Column
    if (dispensingEmps.length > 0) {
      row.push(''); // Empty cell acting as visual separator
    }

    // Dispensing Columns
    dispensingEmps.forEach(emp => {
      row.push(getCellText(schedule, dateKey, emp.id, shiftDefinitions));
    });

    data.push(row);
  }

  // 3. Add Stats at the bottom
  data.push([]); // Vertical spacer row
  
  // Helper to build stat row with spacer
  const buildStatRow = (label: string, getValue: (emp: Employee) => string | number) => {
    const row: (string | number)[] = [label, ''];
    retailEmps.forEach(emp => row.push(getValue(emp)));
    if (dispensingEmps.length > 0) row.push(''); // Spacer
    dispensingEmps.forEach(emp => row.push(getValue(emp)));
    return row;
  };

  data.push(buildStatRow('統計 (本區間)', () => ''));
  
  // Sort shift defs by order
  const sortedDefs = Object.values(shiftDefinitions).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  sortedDefs.forEach(def => {
    const statRow = buildStatRow(def.label, (emp) => {
      let count = 0;
      for (const date of dateRange) {
        const dateKey = format(date, 'yyyy-MM-dd');
        const { code } = parseShiftCode(schedule[dateKey]?.[emp.id]);
        if (code === def.code) count++;
      }
      return count > 0 ? count : '';
    });
    data.push(statRow);
  });

  // Overtime Hours Row
  const otRow = buildStatRow('加班時數', (emp) => {
    let totalOt = 0;
    for (const date of dateRange) {
      const dateKey = format(date, 'yyyy-MM-dd');
      const { code, ot } = parseShiftCode(schedule[dateKey]?.[emp.id]);
      
      if (code && shiftDefinitions[code]) {
        const def = shiftDefinitions[code];
        totalOt += (def.defaultOvertime || 0);
      }
      if (ot > 0) totalOt += ot;
    }
    return totalOt > 0 ? totalOt : '';
  });
  data.push(otRow);

  // Total Hours Row
  const hoursRow = buildStatRow('總時數(含加班)', (emp) => {
    let totalHours = 0;
    for (const date of dateRange) {
      const dateKey = format(date, 'yyyy-MM-dd');
      const { code, ot } = parseShiftCode(schedule[dateKey]?.[emp.id]);
      if (code && shiftDefinitions[code]) {
        const def = shiftDefinitions[code];
        totalHours += def.hours;
        totalHours += (def.defaultOvertime || 0);
        totalHours += ot;
      }
    }
    return totalHours > 0 ? totalHours : '';
  });
  data.push(hoursRow);


  // 4. Create Worksheet
  const worksheetData = [titleRow, [], headerRow, ...data];
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Merge title cells
  if(!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }); 

  // 5. Style adjustments (Column Widths)
  const wscols = [
    { wch: 12 }, // Date
    { wch: 8 },  // Weekday
  ]; 
  
  // Retail Widths
  retailEmps.forEach(() => wscols.push({ wch: 15 }));
  
  // Spacer Width (Narrow)
  if (dispensingEmps.length > 0) {
    wscols.push({ wch: 2 }); // Narrow column to act as border/separator
  }

  // Dispensing Widths
  dispensingEmps.forEach(() => wscols.push({ wch: 15 }));

  ws['!cols'] = wscols;

  // 6. Create Workbook
  const wb = XLSX.utils.book_new();
  const sheetName = `${storeName}_排班`.substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // 7. Download
  XLSX.writeFile(wb, `${storeName}_排班表_${startDateStr.replace(/\//g, '-')}.xlsx`);
};

// Helper to calculate cell text
function getCellText(
  schedule: StoreSchedule, 
  dateKey: string, 
  empId: string, 
  shiftDefinitions: Record<string, ShiftDefinition>
): string {
  const rawValue = schedule[dateKey]?.[empId];
  const { code, ot } = parseShiftCode(rawValue);
  
  let cellText = '';
  if (code && shiftDefinitions[code]) {
    cellText = shiftDefinitions[code].shortLabel || code;
    if (ot > 0) {
      cellText += `+${ot}`;
    }
  }
  return cellText;
}
