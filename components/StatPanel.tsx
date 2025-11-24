
import React, { useMemo } from 'react';
import { Employee, StoreSchedule, ShiftDefinition, parseShiftCode, BuiltInShifts } from '../types';
import { format } from 'date-fns';

interface Props {
  employees: Employee[];
  schedule: StoreSchedule; // Store's entire schedule: Date -> Emp -> Shift
  dateRange: Date[];
  shiftDefinitions: Record<string, ShiftDefinition>; // Added props
}

export const StatPanel: React.FC<Props> = ({ employees, schedule, dateRange, shiftDefinitions }) => {
  
  // Pre-calculate stats for all employees to facilitate row-based rendering
  const stats = useMemo(() => {
    const result: Record<string, { ap: number, full: number, annual: number, ot: number, total: number }> = {};
    
    employees.forEach(emp => {
        let apCount = 0;
        let fullCount = 0;
        let annualHours = 0;
        let totalWorkHours = 0;
        let totalOt = 0;

        dateRange.forEach(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const dailyData = schedule[dateStr] || {};
            const rawValue = dailyData[emp.id];
            const { code, ot } = parseShiftCode(rawValue);
            
            if (code && shiftDefinitions[code]) {
                const def = shiftDefinitions[code];
                
                // Grouping Logic
                if (code === BuiltInShifts.A || code === BuiltInShifts.P) {
                    apCount++;
                } else if (
                    code === BuiltInShifts.A_FULL || 
                    code === BuiltInShifts.P_FULL || 
                    code === BuiltInShifts.FULL_PLUS_2
                ) {
                    fullCount++;
                }

                // Calculation Logic
                if (code === BuiltInShifts.ANNUAL) {
                    // Annual Leave: use OT value as custom hours, or default hours (8)
                    // Do NOT add to totalWorkHours
                    const hours = ot > 0 ? ot : def.hours;
                    annualHours += hours;
                } else if (code !== BuiltInShifts.OFF) {
                    // Regular Work Shift
                    // Base Hours
                    totalWorkHours += def.hours;
                    
                    // Default Overtime
                    const defaultOt = def.defaultOvertime || 0;
                    totalWorkHours += defaultOt;
                    totalOt += defaultOt;

                    // Manual Overtime
                    totalWorkHours += ot;
                    totalOt += ot;
                }
            }
        });
        result[emp.id] = {
            ap: apCount,
            full: fullCount,
            annual: annualHours,
            ot: totalOt,
            total: totalWorkHours
        };
    });
    return result;
  }, [employees, schedule, dateRange, shiftDefinitions]);

  return (
    <div className="bg-white p-3 rounded-lg shadow border border-gray-200 mt-4">
      <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span>📊</span> 排班統計 ({format(dateRange[0], 'MM/dd')} - {format(dateRange[dateRange.length - 1], 'MM/dd')})
      </h3>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-xs text-left text-gray-500 border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 p-2 min-w-[100px] font-bold text-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                統計項目
              </th>
              {employees.map(emp => (
                <th key={emp.id} className="min-w-[80px] border-b border-r border-gray-100 px-1 py-2 text-center bg-gray-50 font-bold text-gray-700 whitespace-nowrap">
                  {emp.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
             {/* Row 1: A/P */}
             <tr className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 p-2 font-medium text-gray-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    A/P 次數
                </td>
                {employees.map(emp => (
                    <td key={emp.id} className="border-b border-r border-gray-100 p-2 text-center font-medium">
                        {stats[emp.id]?.ap > 0 ? stats[emp.id].ap : '-'}
                    </td>
                ))}
             </tr>

             {/* Row 2: Full */}
             <tr className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 p-2 font-medium text-gray-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    全班次數
                </td>
                {employees.map(emp => (
                    <td key={emp.id} className="border-b border-r border-gray-100 p-2 text-center font-medium">
                        {stats[emp.id]?.full > 0 ? stats[emp.id].full : '-'}
                    </td>
                ))}
             </tr>

             {/* Row 3: Annual */}
             <tr className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 p-2 font-medium text-green-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    特休 (時)
                </td>
                {employees.map(emp => (
                    <td key={emp.id} className="border-b border-r border-gray-100 p-2 text-center font-medium text-green-600">
                        {stats[emp.id]?.annual > 0 ? stats[emp.id].annual : '-'}
                    </td>
                ))}
             </tr>

             {/* Row 4: OT */}
             <tr className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 p-2 font-bold text-red-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    加班時數
                </td>
                {employees.map(emp => (
                    <td key={emp.id} className="border-b border-r border-gray-100 p-2 text-center font-mono font-bold text-red-600">
                        {stats[emp.id]?.ot > 0 ? `+${stats[emp.id].ot}` : '-'}
                    </td>
                ))}
             </tr>

             {/* Row 5: Total */}
             <tr className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 p-2 font-bold text-indigo-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    總工時
                </td>
                {employees.map(emp => (
                    <td key={emp.id} className="border-b border-r border-gray-100 p-2 text-center font-mono font-bold text-indigo-600">
                        {stats[emp.id]?.total > 0 ? stats[emp.id].total : '-'}
                    </td>
                ))}
             </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
