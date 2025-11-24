
export type ShiftCode = string;

// Keep these for initial default values, but allow dynamic expansion
export const BuiltInShifts = {
  A: 'A',
  P: 'P',
  A_FULL: 'A_FULL',
  P_FULL: 'P_FULL',
  FULL_PLUS_2: 'FULL_PLUS_2',
  OFF: 'OFF',
  ANNUAL: 'ANNUAL'
} as const;

export interface ShiftDefinition {
  code: string;
  label: string;
  time: string;
  color: string;
  shortLabel: string;
  description?: string;
  hours: number; 
  defaultOvertime?: number; // Added default overtime property
  sortOrder?: number;
}

export type Department = 'retail' | 'dispensing';

export interface Employee {
  id: string;
  name: string;
  department: Department;
}

// Map: DateString (YYYY-MM-DD) -> EmployeeID -> ShiftCode (Format: "CODE" or "CODE:OT_HOURS")
export type DailySchedule = Record<string, ShiftCode>;
export type StoreSchedule = Record<string, DailySchedule>; // Date -> Employee -> Shift

export interface ShiftStats {
  [key: string]: number; // ShiftCode -> count
}

export interface DateRange {
  start: Date;
  end: Date;
}

// Helper to parse "CODE:OT"
export const parseShiftCode = (value: string | undefined) => {
  if (!value) return { code: null, ot: 0 };
  const parts = value.split(':');
  return { 
    code: parts[0], 
    ot: parts.length > 1 ? parseInt(parts[1], 10) : 0 
  };
};
