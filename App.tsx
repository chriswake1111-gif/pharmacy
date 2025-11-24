
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { 
  Users, 
  Download, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Store,
  XCircle,
  Save as SaveIcon,
  CheckCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  HelpCircle,
  Upload,
  FileJson
} from 'lucide-react';

import { ShiftCode, Employee, StoreSchedule, ShiftDefinition, parseShiftCode, BuiltInShifts } from './types';
import { DEFAULT_SHIFT_DEFINITIONS, INITIAL_EMPLOYEES, STORES, DEPARTMENTS } from './constants';
import { generateSmartSchedule } from './services/geminiService';
import { exportToExcel } from './utils/export';
import { EmployeeManager } from './components/EmployeeManager';
import { ShiftManager } from './components/ShiftManager';
import { StatPanel } from './components/StatPanel';
import { DateRangePicker } from './components/DateRangePicker';
import { HelpModal } from './components/HelpModal';

// Structure: Record<StoreName, StoreSchedule>
// StoreSchedule is Record<DateString, Record<EmpId, ShiftCode>>
type GlobalDataState = Record<string, StoreSchedule>;

const App: React.FC = () => {
  // --- State ---
  
  // Initialize Dates (Default to current month 1st to End)
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  const [selectedStore, setSelectedStore] = useState<string>(STORES[0]);
  
  // Revised Employee State: Map<StoreName, Employee[]>
  const [employeesMap, setEmployeesMap] = useState<Record<string, Employee[]>>(() => {
    try {
      const savedMap = localStorage.getItem('pharmacy_employees_v2');
      if (savedMap) {
        const parsedMap = JSON.parse(savedMap);
        const hydratedMap: Record<string, Employee[]> = { ...parsedMap };
        STORES.forEach(store => {
          if (!hydratedMap[store]) {
            hydratedMap[store] = JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
          }
        });
        return hydratedMap;
      }
      const savedOld = localStorage.getItem('pharmacy_employees');
      const baseList = savedOld ? JSON.parse(savedOld) : INITIAL_EMPLOYEES;
      const initialMap: Record<string, Employee[]> = {};
      STORES.forEach(store => {
        initialMap[store] = JSON.parse(JSON.stringify(baseList));
      });
      return initialMap;
    } catch {
      const initialMap: Record<string, Employee[]> = {};
      STORES.forEach(store => {
        initialMap[store] = JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
      });
      return initialMap;
    }
  });

  const [shiftDefs, setShiftDefs] = useState<Record<string, ShiftDefinition>>(() => {
    try {
      const saved = localStorage.getItem('pharmacy_shift_defs');
      return saved ? JSON.parse(saved) : DEFAULT_SHIFT_DEFINITIONS;
    } catch {
      return DEFAULT_SHIFT_DEFINITIONS;
    }
  });
  
  // Saved Data (Source of Truth / Baseline)
  const [savedData, setSavedData] = useState<GlobalDataState>(() => {
    try {
      const saved = localStorage.getItem('pharmacy_data_v2');
      if (saved) return JSON.parse(saved);
      return {};
    } catch {
      return {};
    }
  });

  // Working Copy (Current Edits)
  // Initialize with the exact same data as savedData
  const [allData, setAllData] = useState<GlobalDataState>(() => {
    try {
      const saved = localStorage.getItem('pharmacy_data_v2');
      if (saved) return JSON.parse(saved);
      return {};
    } catch {
      return {};
    }
  });
  
  const [isEmpManagerOpen, setIsEmpManagerOpen] = useState(false);
  const [isShiftManagerOpen, setIsShiftManagerOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // UI State for interactions
  const [selectedCell, setSelectedCell] = useState<{empId: string, dateStr: string} | null>(null);
  const [selectedOvertimeCell, setSelectedOvertimeCell] = useState<{empId: string, dateStr: string, baseCode: string} | null>(null);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [toast, setToast] = useState<string | null>(null);

  // Ref for managing click delay
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Derived State ---
  
  const employees = useMemo(() => {
    return employeesMap[selectedStore] || [];
  }, [employeesMap, selectedStore]);

  const storeSchedule = useMemo(() => {
    return allData[selectedStore] || {};
  }, [allData, selectedStore]);

  // Baseline schedule for comparison
  const baselineSchedule = useMemo(() => {
    return savedData[selectedStore] || {};
  }, [savedData, selectedStore]);
  
  const sortedEmployees = useMemo(() => {
    const retail = employees.filter(e => e.department === 'retail');
    const dispensing = employees.filter(e => e.department === 'dispensing');
    return [...retail, ...dispensing];
  }, [employees]);

  const sortedShifts = useMemo(() => {
    return (Object.values(shiftDefs) as ShiftDefinition[]).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [shiftDefs]);

  const retailCount = employees.filter(e => e.department === 'retail').length;

  const dateRange = useMemo(() => {
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      if (start > end) return []; 
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [startDate, endDate]);

  const displayDays = useMemo(() => {
    return dateRange.map(date => ({
      dateObj: date,
      dateStr: format(date, 'yyyy-MM-dd'),
      dayNum: format(date, 'd'),
      weekday: format(date, 'EE', { locale: zhTW }),
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    }));
  }, [dateRange]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    // Simple comparison (optimization: could be deeper but JSON stringify is safest for nested objects)
    return JSON.stringify(savedData) !== JSON.stringify(allData);
  }, [savedData, allData]);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('pharmacy_employees_v2', JSON.stringify(employeesMap));
  }, [employeesMap]);

  useEffect(() => {
    localStorage.setItem('pharmacy_shift_defs', JSON.stringify(shiftDefs));
  }, [shiftDefs]);

  // NOTE: Removed auto-save for allData to support "Revert to Saved" workflow.
  // Data is only persisted when handleManualSave is called.

  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  // --- Handlers ---

  const showToast = (msg: string) => setToast(msg);

  const handleManualSave = () => {
    setSaveStatus('saving');
    localStorage.setItem('pharmacy_data_v2', JSON.stringify(allData));
    localStorage.setItem('pharmacy_shift_defs', JSON.stringify(shiftDefs));
    localStorage.setItem('pharmacy_employees_v2', JSON.stringify(employeesMap));
    
    // Sync baseline
    setSavedData(JSON.parse(JSON.stringify(allData)));
    
    setTimeout(() => {
      setSaveStatus('saved');
      showToast('資料已成功儲存');
    }, 500);
  };

  const handleBackupData = () => {
    const backup = {
      version: 1,
      timestamp: Date.now(),
      employeesMap,
      shiftDefs,
      data: savedData // Persisted schedules
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('專案備份檔已下載');
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('確定要還原此備份檔嗎？\n\n警告：此動作將會「覆蓋」目前瀏覽器內所有的員工、班別與排班資料，且無法復原。')) {
      e.target.value = ''; // Reset
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Basic validation
        if (json.employeesMap && json.shiftDefs && json.data) {
          setEmployeesMap(json.employeesMap);
          setShiftDefs(json.shiftDefs);
          setSavedData(json.data);
          setAllData(json.data); // Sync working copy
          
          // Persist to local storage immediately
          localStorage.setItem('pharmacy_employees_v2', JSON.stringify(json.employeesMap));
          localStorage.setItem('pharmacy_shift_defs', JSON.stringify(json.shiftDefs));
          localStorage.setItem('pharmacy_data_v2', JSON.stringify(json.data));
          
          showToast('資料還原成功！');
        } else {
          alert('無效的備份檔案格式，請確認是否為本系統產生的 .json 檔案。');
        }
      } catch (err) {
        console.error(err);
        alert('讀取檔案失敗，檔案可能已損毀。');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  const handleSetEmployees = (newEmps: Employee[]) => {
    setEmployeesMap(prev => ({
      ...prev,
      [selectedStore]: newEmps
    }));
  };

  // Update schedule with a shift code (optional OT included in string for now, though mainly used for base code)
  const updateSchedule = (empId: string, dateStr: string, code: ShiftCode) => {
    setAllData(prev => {
      const currentStoreData = prev[selectedStore] || {};
      const dayData = currentStoreData[dateStr] || {};
      
      return {
        ...prev,
        [selectedStore]: {
          ...currentStoreData,
          [dateStr]: {
            ...dayData,
            [empId]: code
          }
        }
      };
    });
    setSelectedCell(null);
  };

  const handleAddOvertime = (empId: string, dateStr: string, baseCode: string, otHours: number) => {
    const newCode = `${baseCode}:${otHours}`;
    updateSchedule(empId, dateStr, newCode);
    setSelectedOvertimeCell(null);
  };

  // Revert specific cell to default (saved) value
  const handleRevertCell = (empId: string, dateStr: string) => {
    const originalValue = savedData[selectedStore]?.[dateStr]?.[empId];

    setAllData(prev => {
      const currentStoreData = prev[selectedStore] || {};
      const dayData = { ...(currentStoreData[dateStr] || {}) };
      
      if (originalValue) {
        dayData[empId] = originalValue;
      } else {
        delete dayData[empId];
      }
      
      return {
        ...prev,
        [selectedStore]: {
          ...currentStoreData,
          [dateStr]: dayData
        }
      };
    });
    setSelectedCell(null);
  };

  const handleCellDoubleClick = (empId: string, dateStr: string, rawCode: string) => {
    if (!rawCode) return;
    const { code } = parseShiftCode(rawCode);
    
    // Check if allowed shift types for overtime
    const allowedShifts: string[] = [BuiltInShifts.A, BuiltInShifts.P, BuiltInShifts.A_FULL, BuiltInShifts.P_FULL];
    
    if (code && allowedShifts.includes(code)) {
       setSelectedOvertimeCell({ empId, dateStr, baseCode: code });
    }
  };

  // Wrapper for Single Click (Delayed)
  const onCellClick = (empId: string, dateStr: string) => {
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      setSelectedCell({ empId, dateStr });
      clickTimeoutRef.current = null;
    }, 250); // 250ms delay to check for double click
  };

  // Wrapper for Double Click (Immediate)
  const onCellDoubleClick = (empId: string, dateStr: string, rawValue: string) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    if (rawValue) {
      handleCellDoubleClick(empId, dateStr, rawValue);
    }
  };

  const handleClearRangeRequest = () => {
    if (displayDays.length === 0) {
      showToast('請先選擇有效的日期區間');
      return;
    }
    setIsClearConfirmOpen(true);
  };

  // Revert entire range to default (saved) state
  const performRevertRange = () => {
    setAllData(prev => {
      const currentStoreData = { ...(prev[selectedStore] || {}) };
      
      // Iterate over days in the selected range
      displayDays.forEach(day => {
        const savedDayData = savedData[selectedStore]?.[day.dateStr];
        
        if (savedDayData) {
          // If saved data exists, restore it
          currentStoreData[day.dateStr] = { ...savedDayData };
        } else {
          // If no saved data existed, clear the current working data
          delete currentStoreData[day.dateStr];
        }
      });

      return {
        ...prev,
        [selectedStore]: currentStoreData
      };
    });
    setIsClearConfirmOpen(false);
    showToast('已回復區間內的預設班別');
  };

  const handleAISchedule = async () => {
    if (displayDays.length === 0) return;
    setIsGenerating(true);
    try {
      const newSchedule = await generateSmartSchedule({
        employees: sortedEmployees,
        dateRange,
        existingSchedule: storeSchedule,
        shiftDefinitions: shiftDefs
      });
      
      // Merge
      setAllData(prev => {
        const currentStoreData = { ...(prev[selectedStore] || {}) };
        
        Object.entries(newSchedule).forEach(([dateStr, assignments]) => {
          if (!currentStoreData[dateStr]) currentStoreData[dateStr] = {};
          Object.entries(assignments).forEach(([empId, code]) => {
            currentStoreData[dateStr][empId] = code;
          });
        });

        return {
          ...prev,
          [selectedStore]: currentStoreData
        };
      });
      showToast('AI 智能排班完成');

    } catch (error) {
      console.error(error);
      alert('AI 排班失敗，請稍後再試。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (displayDays.length === 0) return;
    try {
      exportToExcel(selectedStore, sortedEmployees, storeSchedule, dateRange, shiftDefs);
      showToast('Excel 匯出成功');
    } catch (e) {
      console.error(e);
      alert('匯出失敗');
    }
  };

  // --- Render ---
  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 text-slate-900">
      {/* Hidden File Input for Restore */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleRestoreData} 
        className="hidden" 
        accept=".json" 
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-xl z-[100] animate-fade-in-up flex items-center gap-3">
          <CheckCircle size={20} className="text-green-400" />
          <span className="font-medium">{toast}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-brand">
                <CalendarIcon size={20} />
              </div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight hidden md:block">
                Pharmacy<span className="text-brand-600">Shift</span>Pro
              </h1>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 hover:border-brand-400 transition-colors">
              <Store size={16} className="text-gray-500" />
              <select 
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer outline-none min-w-[80px]"
              >
                {STORES.map(store => (
                  <option key={store} value={store}>{store}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
             <button
              onClick={() => setIsShiftManagerOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-brand-600 transition-colors"
            >
              <Clock size={16} />
              <span className="hidden sm:inline">管理班別</span>
            </button>

             <button
              onClick={() => setIsEmpManagerOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-brand-600 transition-colors"
            >
              <Users size={16} />
              <span className="hidden sm:inline">管理員工</span>
            </button>
            
            <button
              onClick={handleManualSave}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all shadow-sm
                ${saveStatus === 'saved' 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : hasUnsavedChanges 
                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-300 ring-2 ring-yellow-200 animate-pulse-slow' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {saveStatus === 'saved' ? <CheckCircle size={16} /> : <SaveIcon size={16} />}
              <span className="hidden sm:inline">
                {saveStatus === 'saving' ? '儲存中...' : saveStatus === 'saved' ? '已儲存' : hasUnsavedChanges ? '儲存變更' : '儲存'}
              </span>
            </button>

            <button
              onClick={handleAISchedule}
              disabled={isGenerating || displayDays.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-wait transition-all shadow-sm"
            >
              <Sparkles size={16} className={isGenerating ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{isGenerating ? 'AI 思考中' : 'AI 排班'}</span>
              <span className="sm:hidden">{isGenerating ? '...' : 'AI'}</span>
            </button>

            <div className="h-6 w-px bg-gray-300 mx-1"></div>

             <button
              onClick={handleExport}
              disabled={displayDays.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
              title="匯出 Excel"
            >
              <Download size={16} />
              <span className="hidden lg:inline">匯出</span>
            </button>

            {/* Backup & Restore Icons */}
            <button
              onClick={handleBackupData}
              className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors border border-transparent hover:border-brand-200"
              title="備份專案檔案 (下載 JSON)"
            >
               <FileJson size={20} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors border border-transparent hover:border-brand-200"
              title="還原/匯入專案檔案"
            >
               <Upload size={20} />
            </button>

            {/* Help Button */}
            <button
              onClick={() => setIsHelpOpen(true)}
              className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors ml-1"
              title="操作說明"
            >
              <HelpCircle size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-2 sm:px-6 py-6 flex flex-col">
        
        {/* Toolbar with Date Range Picker */}
        <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-4">
          
          <div className="flex items-center gap-4">
             {/* New Date Picker Component */}
             <DateRangePicker 
               startDate={startDate} 
               endDate={endDate} 
               onChange={(start, end) => {
                 setStartDate(start);
                 setEndDate(end);
               }} 
             />
             
             {displayDays.length > 0 && (
               <span className="text-xs text-gray-400 font-medium px-2 border-l border-gray-200">
                 共 {displayDays.length} 天
               </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
             {sortedShifts.map(def => (
               <div key={def.code} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-full shadow-sm whitespace-nowrap cursor-help" title={`${def.label}: ${def.time} (${def.hours}h)`}>
                 <div className={`w-3 h-3 rounded-full ${def.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                 <span className="text-xs font-medium text-gray-600">{def.label}</span>
               </div>
             ))}
             <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block"></div>
             <button 
              type="button"
              onClick={handleClearRangeRequest}
              className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md border border-red-200 text-xs font-bold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
              title="回復此區間為預設班別"
             >
               <RotateCcw size={14} /> 回復預設
             </button>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-280px)]">
          {displayDays.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 font-medium">
              請選擇有效的日期區間
            </div>
          ) : (
            <div className="overflow-auto flex-1 relative custom-scrollbar">
              <table className="border-collapse w-full">
                <thead className="sticky top-0 z-30 bg-gray-50 text-gray-700 shadow-sm">
                  <tr>
                    {/* Date Column Header */}
                    <th className="sticky left-0 z-40 bg-gray-50 border-b border-r border-gray-200 min-w-[100px] p-2 text-center font-bold text-sm text-gray-500">
                      日期 / 星期
                    </th>
                    
                    {/* Retail Employees Header */}
                    {retailCount > 0 && (
                       <th 
                          colSpan={retailCount} 
                          className="border-b border-r border-gray-200 bg-green-50 text-green-700 py-1.5 text-xs font-bold tracking-wider uppercase text-center"
                       >
                         {DEPARTMENTS.retail}
                       </th>
                    )}
                    
                    {/* Dispensing Employees Header */}
                    {sortedEmployees.length - retailCount > 0 && (
                       <th 
                          colSpan={sortedEmployees.length - retailCount} 
                          className="border-b border-r border-gray-200 bg-blue-50 text-blue-700 py-1.5 text-xs font-bold tracking-wider uppercase text-center"
                       >
                         {DEPARTMENTS.dispensing}
                       </th>
                    )}
                  </tr>
                  <tr>
                    <th className="sticky left-0 z-40 bg-gray-50 border-b border-r border-gray-200 h-10 w-20"></th>
                     {/* Employee Names */}
                     {sortedEmployees.map(emp => (
                      <th key={emp.id} className="min-w-[90px] border-b border-r border-gray-100 px-1 py-2 text-center bg-gray-50 font-bold text-gray-700 text-sm whitespace-nowrap">
                        {emp.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {displayDays.map((dayInfo) => (
                    <tr key={dayInfo.dateStr} className="hover:bg-gray-50 transition-colors">
                      {/* Date Cell */}
                      <td className={`sticky left-0 z-20 border-r border-b border-gray-100 p-2 text-center font-medium text-sm
                        ${dayInfo.isWeekend ? 'bg-orange-50 text-orange-800' : 'bg-white text-gray-500'}
                      `}>
                        <div className="flex flex-row items-center justify-between px-2">
                          <span className="text-lg font-bold leading-none">{dayInfo.dayNum}</span>
                          <span className="text-xs font-bold uppercase">{dayInfo.weekday}</span>
                        </div>
                      </td>

                      {/* Employee Cells */}
                      {sortedEmployees.map((emp) => {
                        const rawValue = storeSchedule[dayInfo.dateStr]?.[emp.id];
                        const originalValue = baselineSchedule[dayInfo.dateStr]?.[emp.id];
                        const isDirty = rawValue !== originalValue;

                        const { code, ot } = parseShiftCode(rawValue);
                        const shiftDef = code ? shiftDefs[code] : null;

                        return (
                          <td 
                            key={emp.id} 
                            className={`relative border-b border-r border-gray-100 p-1 text-center h-14
                              ${dayInfo.isWeekend ? 'bg-orange-50/10' : ''}
                            `}
                          >
                            <button
                              onClick={() => onCellClick(emp.id, dayInfo.dateStr)}
                              onDoubleClick={() => rawValue && onCellDoubleClick(emp.id, dayInfo.dateStr, rawValue)}
                              className={`w-full h-full rounded-md flex items-center justify-center transition-all text-sm font-bold shadow-sm select-none relative
                                ${shiftDef 
                                  ? `${shiftDef.color} hover:brightness-95` 
                                  : 'text-transparent hover:bg-gray-100 hover:text-gray-300'
                                }
                                ${isDirty ? 'ring-2 ring-yellow-400 border-transparent' : ''}
                              `}
                            >
                              {shiftDef ? (
                                <div className="flex items-center gap-0.5">
                                   <span>{shiftDef.shortLabel}</span>
                                   {ot > 0 && <span className="text-[10px] bg-white/50 px-1 rounded-full text-gray-800">+{ot}</span>}
                                </div>
                              ) : '+'}
                              
                              {isDirty && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Global Shift Selector (Modal-like Fixed Positioning) */}
        {selectedCell && (
          <>
            <div 
              className="fixed inset-0 z-[50] cursor-default bg-black/5" 
              onClick={() => setSelectedCell(null)}
            />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white shadow-2xl rounded-xl border border-gray-200 p-4 min-w-[320px] z-[60] animate-fade-in-up">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-700">選擇班別</span>
                <button onClick={() => setSelectedCell(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={18} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full">
                {sortedShifts.map(def => (
                  <button
                  key={def.code}
                  onClick={() => {
                    if (selectedCell) {
                      updateSchedule(selectedCell.empId, selectedCell.dateStr, def.code);
                    }
                  }}
                  className={`text-sm px-2 py-3 rounded-lg ${def.color} hover:brightness-95 hover:shadow-md transition-all truncate border font-bold flex flex-col items-center justify-center gap-1`}
                  >
                    <span>{def.shortLabel}</span>
                    <span className="text-[10px] opacity-70 scale-90">{def.hours}h</span>
                  </button>
                ))}
                {/* Clear Option inside grid */}
                <button
                  onClick={() => {
                      if (selectedCell) {
                        handleRevertCell(selectedCell.empId, selectedCell.dateStr);
                      }
                  }}
                  className="text-sm px-2 py-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 border border-gray-200 transition-all font-bold flex items-center justify-center gap-1 col-span-1"
                  title="回復為預設值"
                  >
                    <RotateCcw size={16} /> <span className="text-xs">回復預設</span>
                  </button>
              </div>
            </div>
          </>
        )}

        {/* Overtime Selector */}
        {selectedOvertimeCell && (
          <>
             <div 
              className="fixed inset-0 z-[70] cursor-default bg-black/5" 
              onClick={() => setSelectedOvertimeCell(null)}
            />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white shadow-2xl rounded-xl border border-gray-200 p-4 w-[280px] z-[80] animate-fade-in-up">
               <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                   <Clock size={18} className="text-brand-600" />
                   <span className="text-sm font-bold text-gray-700">設定加班時數</span>
                </div>
                <button onClick={() => setSelectedOvertimeCell(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3 text-center">
                 目前班別: <span className="font-bold text-gray-800">{shiftDefs[selectedOvertimeCell.baseCode]?.label}</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                 {[1, 2, 3, 4].map(hour => (
                    <button
                       key={hour}
                       onClick={() => handleAddOvertime(selectedOvertimeCell.empId, selectedOvertimeCell.dateStr, selectedOvertimeCell.baseCode, hour)}
                       className="flex flex-col items-center justify-center py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 hover:shadow-sm transition-all font-bold"
                    >
                       <span className="text-lg">+{hour}</span>
                       <span className="text-[10px] opacity-70">小時</span>
                    </button>
                 ))}
              </div>
              <button
                 onClick={() => handleAddOvertime(selectedOvertimeCell.empId, selectedOvertimeCell.dateStr, selectedOvertimeCell.baseCode, 0)}
                 className="w-full mt-3 py-2 text-xs text-gray-500 hover:bg-gray-50 rounded border border-gray-200"
              >
                 清除加班
              </button>
            </div>
          </>
        )}

        {/* Stats Panel */}
        {displayDays.length > 0 && (
           <StatPanel 
             employees={sortedEmployees} 
             schedule={storeSchedule} 
             dateRange={dateRange}
             shiftDefinitions={shiftDefs}
           />
        )}
      </main>
      
      {/* Clear Confirmation Modal */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold">確認回復預設排班？</h3>
            </div>
            <p className="text-gray-600 mb-2">
              您確定要將 <strong>{selectedStore}</strong> 在此區間的排班回復到上次儲存的狀態嗎？
            </p>
            <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 mb-6 font-mono">
              {startDate} ~ {endDate}
            </p>
            <p className="text-xs text-red-500 mb-6 font-bold">
              此動作將會遺失所有尚未儲存的修改！
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button 
                onClick={performRevertRange}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium shadow-md transition-colors"
              >
                確認回復
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <EmployeeManager 
        employees={employees} 
        setEmployees={handleSetEmployees} 
        isOpen={isEmpManagerOpen} 
        onClose={() => setIsEmpManagerOpen(false)} 
        storeName={selectedStore}
      />

      <ShiftManager
        shiftDefs={shiftDefs}
        setShiftDefs={setShiftDefs}
        isOpen={isShiftManagerOpen}
        onClose={() => setIsShiftManagerOpen(false)}
      />

      <HelpModal 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
      />

    </div>
  );
};

export default App;
