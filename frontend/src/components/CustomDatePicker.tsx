import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
  label?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select Date',
  className = '',
  align = 'left',
  label
}) => {
  const { isDarkMode } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date or default to today
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewDate, setViewDate] = useState<Date>(
    isNaN(initialDate.getTime()) ? new Date() : initialDate
  );

  // Synchronize viewDate when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) setViewDate(d);
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (dayNum: number) => {
    const selectedMonth = (month + 1).toString().padStart(2, '0');
    const selectedDay = dayNum.toString().padStart(2, '0');
    const dateStr = `${year}-${selectedMonth}-${selectedDay}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    onChange(todayStr);
    setViewDate(new Date());
    setIsOpen(false);
  };

  const formatDisplayDate = (valStr: string) => {
    if (!valStr) return placeholder;
    const d = new Date(valStr + 'T00:00:00');
    if (isNaN(d.getTime())) return valStr;
    return d.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calendar calculations
  const totalDays = getDaysInMonth(year, month);
  const startDay = getFirstDayOfMonth(year, month);
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const blankCells = Array.from({ length: startDay }, (_, i) => i);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-full min-h-[40px] px-3 py-2 rounded-xl border transition-all flex items-center justify-between space-x-2 text-xs font-extrabold cursor-pointer active:scale-98 ${
          isOpen
            ? 'border-brand-primary ring-2 ring-brand-primary/20 shadow-md'
            : isDarkMode
              ? 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
              : 'bg-white border-slate-200 text-slate-800 shadow-xs hover:border-slate-300'
        }`}
      >
        <div className="flex items-center space-x-2 truncate">
          <CalendarIcon className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
          <span className="truncate">
            {label ? `${label}: ${formatDisplayDate(value)}` : formatDisplayDate(value)}
          </span>
        </div>
      </button>

      {/* Custom Calendar Popover Modal */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-50 w-72 max-w-[calc(100vw-2.5rem)] sm:w-80 rounded-2xl border p-3.5 sm:p-4 shadow-2xl backdrop-blur-2xl transition-all animate-fadeIn ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            isDarkMode
              ? 'bg-slate-900/98 border-slate-800 text-slate-100 shadow-slate-950/90'
              : 'bg-white/98 border-slate-200/90 text-slate-900 shadow-slate-900/20'
          }`}
        >
          {/* Header: Month / Year Nav */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={prevMonth}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs sm:text-sm font-black tracking-tight">
              {monthNames[month]} {year}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week Row */}
          <div className="grid grid-cols-7 gap-1 text-center py-2">
            {daysOfWeek.map((day) => (
              <span key={day} className="text-[10px] font-extrabold text-slate-400 uppercase">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {blankCells.map((_, idx) => (
              <div key={`blank-${idx}`} className="h-8 sm:h-9" />
            ))}

            {daysArray.map((dayNum) => {
              const currentCellDateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
              const isSelected = currentCellDateStr === value;
              const isTodayDate = currentCellDateStr === todayStr;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 sm:h-9 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'btn-gradient-primary text-white shadow-md scale-105'
                      : isTodayDate
                        ? 'border border-brand-primary text-brand-primary bg-sky-50/50 dark:bg-sky-950/40'
                        : isDarkMode
                          ? 'text-slate-200 hover:bg-slate-800'
                          : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Action Buttons */}
          <div className="pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSelectToday}
              className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800/60 text-brand-primary font-black hover:bg-sky-100 transition-all cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-xl text-slate-400 font-bold hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
