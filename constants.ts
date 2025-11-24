
import { ShiftDefinition, Employee, BuiltInShifts } from './types';

export const STORES = [
  "東勢店",
  "新社店",
  "卓蘭店",
  "北苗店",
  "巨蛋店",
  "後龍店",
  "沙鹿店",
  "清水店"
];

export const DEPARTMENTS = {
  retail: '門市部',
  dispensing: '調劑部'
};

export const DEFAULT_SHIFT_DEFINITIONS: Record<string, ShiftDefinition> = {
  [BuiltInShifts.A]: {
    code: BuiltInShifts.A,
    label: 'A班',
    time: '09:00 - 17:30',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    shortLabel: 'A',
    description: '8小時 (扣0.5休)',
    hours: 8,
    sortOrder: 1
  },
  [BuiltInShifts.P]: {
    code: BuiltInShifts.P,
    label: 'P班',
    time: '13:30 - 22:00',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    shortLabel: 'P',
    description: '8小時 (扣0.5休)',
    hours: 8,
    sortOrder: 2
  },
  [BuiltInShifts.A_FULL]: {
    code: BuiltInShifts.A_FULL,
    label: 'A全',
    time: '09:00 - 20:00',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    shortLabel: 'A全',
    description: '10小時 (扣1.0休)',
    hours: 10,
    sortOrder: 3
  },
  [BuiltInShifts.P_FULL]: {
    code: BuiltInShifts.P_FULL,
    label: 'P全',
    time: '11:00 - 22:00',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    shortLabel: 'P全',
    description: '10小時 (扣1.0休)',
    hours: 10,
    sortOrder: 4
  },
  [BuiltInShifts.FULL_PLUS_2]: {
    code: BuiltInShifts.FULL_PLUS_2,
    label: '全+2',
    time: '09:00 - 22:00',
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    shortLabel: '全+2',
    description: '10小時 + 2小時加班',
    hours: 10, // Regular hours
    defaultOvertime: 2, // Default overtime hours
    sortOrder: 5
  },
  [BuiltInShifts.OFF]: {
    code: BuiltInShifts.OFF,
    label: '例假',
    time: '休假',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    shortLabel: '休',
    description: '例假日',
    hours: 0,
    sortOrder: 6
  },
  [BuiltInShifts.ANNUAL]: {
    code: BuiltInShifts.ANNUAL,
    label: '特休',
    time: '休假',
    color: 'bg-green-100 text-green-700 border-green-200',
    shortLabel: '特',
    description: '特休假',
    hours: 8, // Default 8 hours, but excluded from working stats usually
    sortOrder: 7
  },
};

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: '王藥師', department: 'dispensing' },
  { id: '2', name: '李藥師', department: 'dispensing' },
  { id: '3', name: '張助理', department: 'retail' },
  { id: '4', name: '陳助理', department: 'retail' },
];
