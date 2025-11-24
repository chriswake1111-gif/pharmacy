import React, { useState, useEffect, useRef } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isWithinInterval,
  isBefore,
  isAfter,
  parseISO,
  isValid
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

interface Props {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export const DateRangePicker: React.FC<Props> = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize state from props when opening
  useEffect(() => {
    if (isOpen) {
      const s = parseISO(startDate);
      const e = parseISO(endDate);
      if (isValid(s)) {
        setTempStart(s);
        setViewDate(s); // Focus view on start date
      }
      if (isValid(e)) setTempEnd(e);
    }
  }, [isOpen, startDate, endDate]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDayClick = (day: Date) => {
    if (!tempStart || (tempStart && tempEnd)) {
      // Start new selection
      setTempStart(day);
      setTempEnd(null);
    } else {
      // Complete selection
      if (isBefore(day, tempStart)) {
        setTempEnd(tempStart);
        setTempStart(day);
        confirmSelection(day, tempStart);
      } else {
        setTempEnd(day);
        confirmSelection(tempStart, day);
      }
    }
  };

  const confirmSelection = (start: Date, end: Date) => {
    onChange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
    // Optional: Keep open or close? Usually close on selection complete is nice, 
    // but maybe user wants to adjust. Let's close after a short delay or keep open.
    // UX decision: Close immediately for snappy feel.
    setTimeout(() => setIsOpen(false), 200);
  };

  const isInRange = (day: Date) => {
    if (tempStart && tempEnd) {
      return isWithinInterval(day, { start: tempStart, end: tempEnd });
    }
    if (tempStart && hoverDate && !tempEnd) {
       // Preview range
       const start = isBefore(day, tempStart) ? day : tempStart;
       const end = isBefore(day, tempStart) ? tempStart : (isAfter(day, hoverDate) ? hoverDate : day);
       
       // Handle the case where hover is before start
       if (isBefore(hoverDate, tempStart)) {
         return isWithinInterval(day, { start: hoverDate, end: tempStart });
       }
       return isWithinInterval(day, { start: tempStart, end: hoverDate });
    }
    return false;
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDateGrid = startOfWeek(monthStart);
    const endDateGrid = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDateGrid, end: endDateGrid });
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    return (
      <div className="p-4 w-[320px]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => setViewDate(subMonths(viewDate, 1))}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-bold text-gray-800 text-lg">
            {format(viewDate, 'yyyy年 M月', { locale: zhTW })}
          </span>
          <button 
            onClick={() => setViewDate(addMonths(viewDate, 1))}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {days.map(day => {
            const isCurrentMonth = isSameMonth(day, viewDate);
            const isSelectedStart = tempStart && isSameDay(day, tempStart);
            const isSelectedEnd = tempEnd && isSameDay(day, tempEnd);
            const isRange = isInRange(day);
            const isToday = isSameDay(day, new Date());

            let bgClass = '';
            let textClass = '';
            let roundedClass = 'rounded-md';

            if (isSelectedStart || isSelectedEnd) {
              bgClass = 'bg-brand-600 text-white shadow-md z-10';
              textClass = 'font-bold';
            } else if (isRange) {
              bgClass = 'bg-brand-50 text-brand-700';
              textClass = '';
              roundedClass = ''; // Connect the range visually
              // Add specific rounding for edges if we wanted perfect pixel CSS, 
              // but simple highlight is usually enough for mini calendar.
              // Let's refine rounding:
              if (tempStart && isSameDay(day, tempStart)) roundedClass = 'rounded-l-md';
              if (tempEnd && isSameDay(day, tempEnd)) roundedClass = 'rounded-r-md';
            } else if (isToday) {
              textClass = 'text-brand-600 font-bold border border-brand-200';
            } else {
              textClass = isCurrentMonth ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-50';
            }

            return (
              <button
                key={day.toString()}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHoverDate(day)}
                className={`
                  relative h-9 w-full flex items-center justify-center text-sm transition-all
                  ${bgClass} ${textClass} ${roundedClass}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-all
          ${isOpen ? 'border-brand-500 ring-2 ring-brand-100' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <CalendarIcon size={16} className="text-gray-500" />
        <span className="text-gray-700">
          {startDate.replace(/-/g, '/')}
          <span className="mx-2 text-gray-400">➜</span>
          {endDate.replace(/-/g, '/')}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-xl border border-gray-200 animate-fade-in-up">
           {renderCalendar()}
           
           {/* Footer / Quick Select */}
           <div className="border-t border-gray-100 p-3 bg-gray-50 rounded-b-xl flex justify-between items-center">
             <span className="text-xs text-gray-500">
               {tempStart ? (
                  tempEnd ? '已選擇區間' : '請選擇結束日期'
               ) : '請選擇開始日期'}
             </span>
             <button 
               onClick={() => setIsOpen(false)}
               className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
             >
               關閉
             </button>
           </div>
        </div>
      )}
    </div>
  );
};