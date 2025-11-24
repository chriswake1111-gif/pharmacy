
import React from 'react';
import { Employee, StoreSchedule, ShiftDefinition, parseShiftCode } from '../types';
import { format } from 'date-fns';

interface Props {
  employees: Employee[];
  schedule: StoreSchedule; // Store's entire schedule: Date -> Emp -> Shift
  dateRange: Date[];
  shiftDefinitions: Record<string, ShiftDefinition>; // Added props
}

export const StatPanel: React.FC<Props> = ({ employees, schedule, dateRange, shiftDefinitions }) => {
  const sortedDefs = (Object.values(shiftDefinitions) as ShiftDefinition[]).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span>📊</span> 排班統計 ({format(dateRange[0], 'MM/dd')} - {format(dateRange[dateRange.length - 1], 'MM/dd')})
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-2">員工</th>
              {sortedDefs.map((def) => (
                <th key={def.code} className="px-2 py-2 text-center whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded ${def.color} text-xs`}>
                    {def.shortLabel}
                  </span>
                </th>
              ))}
              <th className="px-4 py-2 text-center font-bold text-red-600">加班時數</th>
              <th className="px-4 py-2 text-center font-bold">總時數</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const counts: Record<string, number> = {};
              let totalHours = 0;
              let totalOt = 0;

              // Iterate through the visible date range
              dateRange.forEach(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const dailyData = schedule[dateStr] || {};
                const rawValue = dailyData[emp.id];
                const { code, ot } = parseShiftCode(rawValue);
                
                if (code && shiftDefinitions[code]) {
                  counts[code] = (counts[code] || 0) + 1;
                  const def = shiftDefinitions[code];
                  
                  // Regular Hours
                  totalHours += def.hours;
                  
                  // Default Overtime from Shift Definition (e.g., Full+2 has 2h default OT)
                  const defaultOt = def.defaultOvertime || 0;
                  totalHours += defaultOt;
                  totalOt += defaultOt;

                  // Manual Overtime added on top
                  totalHours += ot;
                  totalOt += ot;
                }
              });

              return (
                <tr key={emp.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">{emp.name}</td>
                  {sortedDefs.map((def) => (
                    <td key={def.code} className="px-2 py-2 text-center">
                      {counts[def.code] || '-'}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-center font-mono font-bold text-red-600">
                     {totalOt > 0 ? `+${totalOt}` : '-'}
                  </td>
                  <td className="px-4 py-2 text-center font-mono font-bold text-indigo-600">
                    {totalHours > 0 ? totalHours : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
