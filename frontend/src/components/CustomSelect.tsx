import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useStore } from '../store/useStore';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  align?: 'left' | 'right';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  icon,
  align = 'left'
}) => {
  const { isDarkMode } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

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

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

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
          {icon && <span className="flex-shrink-0 text-brand-primary">{icon}</span>}
          {selectedOption?.icon && <span className="flex-shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-brand-primary' : ''
          }`}
        />
      </button>

      {/* Options Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 min-w-[160px] sm:min-w-[200px] max-w-[calc(100vw-1.5rem)] w-full max-h-64 overflow-y-auto rounded-2xl border p-1.5 shadow-2xl backdrop-blur-xl transition-all animate-fadeIn custom-scrollbar ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            isDarkMode
              ? 'bg-slate-900/98 border-slate-800 text-slate-100 shadow-slate-950/90'
              : 'bg-white/98 border-slate-200/90 text-slate-900 shadow-slate-900/15'
          }`}
        >
          <div className="space-y-1">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-brand-primary font-black border border-sky-200/60 dark:border-sky-800/60'
                      : isDarkMode
                        ? 'text-slate-200 font-bold hover:bg-slate-800/80 hover:text-white'
                        : 'text-slate-700 font-bold hover:bg-slate-100/90 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate pr-2">
                    {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
