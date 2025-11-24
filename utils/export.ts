
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Employee, StoreSchedule, ShiftDefinition, parseShiftCode, BuiltInShifts } from '../types';

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
  
  const startDateStr = format(dateRange[0], 'yyyy/MM/dd');
  const endDateStr = format(dateRange[dateRange.length - 1], 'yyyy/MM/dd');

  // 0. Prepare Title Row
  const totalCols = 2 + retailEmps.length + (dispensingEmps.length > 0 ? 1 : 0) + dispensingEmps.length;
  const titleRow = [`${storeName} 排班表 (${startDateStr} - ${endDateStr})`];

  // 1. Prepare Header Row 
  const headerRow = [
    '日期', 
    '星期', 
    ...retailEmps.map(e => e.name), 
    ...(dispensingEmps.length > 0 ? [''] : []), // Spacer Header
    ...dispensingEmps.map(e => e.name)
  ];

  // 2. Prepare Data Rows
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
      row.push(''); 
    }

    // Dispensing Columns
    dispensingEmps.forEach(emp => {
      row.push(getCellText(schedule, dateKey, emp.id, shiftDefinitions));
    });

    data.push(row);
  }

  // 3. Add Stats
  data.push([]); // Vertical spacer row
  
  const buildStatRow = (label: string, getValue: (emp: Employee) => string | number) => {
    const row: (string | number)[] = [label, ''];
    retailEmps.forEach(emp => row.push(getValue(emp)));
    if (dispensingEmps.length > 0) row.push(''); 
    dispensingEmps.forEach(emp => row.push(getValue(emp)));
    return row;
  };

  data.push(buildStatRow('統計 (本區間)', () => ''));
  
  // A/P Count Row
  data.push(buildStatRow('A/P', (emp) => {
    let count = 0;
    for (const date of dateRange) {
      const dateKey = format(date, 'yyyy-MM-dd');
      const { code } = parseShiftCode(schedule[dateKey]?.[emp.id]);
      if (code === BuiltInShifts.A || code === BuiltInShifts.P) count++;
    }
    return count > 0 ? count : '';
  }));

  // Full Count Row (A全, P全, 全+2)
  data.push(buildStatRow('全', (emp) => {
    let count = 0;
    for (const date of dateRange) {
      const dateKey = format(date, 'yyyy-MM-dd');
      const { code } = parseShiftCode(schedule[dateKey]?.[emp.id]);
      if (code === BuiltInShifts.A_FULL || code === BuiltInShifts.P_FULL || code === BuiltInShifts.FULL_PLUS_2) count++;
    }
    return count > 0 ? count : '';
  }));

  // Annual Leave Hours Row
  data.push(buildStatRow('特休(時)', (emp) => {
    let hours = 0;
    for (const date of dateRange) {
      const dateKey = format(date, 'yyyy-MM-dd');
      const { code, ot } = parseShiftCode(schedule[dateKey]?.[emp.id]);
      if (code === BuiltInShifts.ANNUAL) {
         const def = shiftDefinitions[code];
         // Use OT slot for custom annual hours, default to def.hours (8)
         hours += (ot > 0 ? ot : def.hours);
      }
    }
    return hours > 0 ? hours : '';
  }));

  // Overtime Hours Row
  const otRow = buildStatRow('加班時數', (emp) => {
    let totalOt = 0;
    for (const date of dateRange) {
      const dateKey = format(date, 'yyyy-MM-dd');
      const { code, ot } = parseShiftCode(schedule[dateKey]?.[emp.id]);
      if (code && shiftDefinitions[code] && code !== BuiltInShifts.ANNUAL && code !== BuiltInShifts.OFF) {
        const def = shiftDefinitions[code];
        totalOt += (def.defaultOvertime || 0);
        totalOt += ot;
      }
    }
    return totalOt > 0 ? totalOt : '';
  });
  data.push(otRow);

  // Total Work Hours Row (Excluding Annual Leave)
  const hoursRow = buildStatRow('總工時(不含特休)', (emp) => {
    let totalHours = 0;
    for (const date of dateRange) {
      const dateKey = format(date, 'yyyy-MM-dd');
      const { code, ot } = parseShiftCode(schedule[dateKey]?.[emp.id]);
      if (code && shiftDefinitions[code] && code !== BuiltInShifts.ANNUAL && code !== BuiltInShifts.OFF) {
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

  // Merge title
  if(!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }); 

  // 5. Styles
  const wscols = [
    { wch: 12 }, // Date
    { wch: 8 },  // Weekday
  ]; 
  retailEmps.forEach(() => wscols.push({ wch: 15 }));
  if (dispensingEmps.length > 0) wscols.push({ wch: 2 });
  dispensingEmps.forEach(() => wscols.push({ wch: 15 }));

  ws['!cols'] = wscols;

  // 6. Create Workbook
  const wb = XLSX.utils.book_new();
  const sheetName = `${storeName}_排班`.substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // 7. Download
  XLSX.writeFile(wb, `${storeName}_排班表_${startDateStr.replace(/\//g, '-')}.xlsx`);
};

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
    
    // Special display for Annual Leave with custom hours
    if (code === BuiltInShifts.ANNUAL) {
       if (ot > 0 && ot !== shiftDefinitions[code].hours) {
         cellText += `(${ot})`;
       }
    } else {
       // Normal Overtime
       if (ot > 0) {
         cellText += `+${ot}`;
       }
    }
  }
  return cellText;
}
