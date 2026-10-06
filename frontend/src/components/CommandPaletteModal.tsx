import React, { useEffect, useState } from 'react';
import {
  Search,
  BookOpen,
  Receipt,
  Users,
  Package,
  PlusCircle,
  Settings,
  Wallet,
  ArrowRight,
  Sparkles,
  Command,
  X
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: string) => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Navigation' | 'Quick Actions';
  icon: any;
  action: () => void;
  shortcut?: string;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { isDarkMode } = useStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items: CommandItem[] = [
    {
      id: 'dash',
      title: 'Store Dashboard & Analytics',
      subtitle: 'View real-time revenue, cash insights, and low stock alerts',
      category: 'Navigation',
      icon: Sparkles,
      action: () => onNavigate('dashboard'),
      shortcut: 'Alt + D'
    },
    {
      id: 'cashbook',
      title: 'Daily Cash Register & Drawer Book',
      subtitle: 'Record cash in, cash out & daily closing balance',
      category: 'Navigation',
      icon: BookOpen,
      action: () => onNavigate('cashbook'),
      shortcut: 'Alt + C'
    },
    {
      id: 'billbook',
      title: 'Billing & Invoice Book',
      subtitle: 'Create GST bills, invoices, and POS receipts',
      category: 'Navigation',
      icon: Receipt,
      action: () => onNavigate('billbook'),
      shortcut: 'Alt + B'
    },
    {
      id: 'directory',
      title: 'Customer & Udhar Directory',
      subtitle: 'Manage customer accounts, khata ledgers & suppliers',
      category: 'Navigation',
      icon: Users,
      action: () => onNavigate('directory'),
      shortcut: 'Alt + U'
    },
    {
      id: 'products',
      title: 'Inventory & Products List',
      subtitle: 'Manage stock levels, prices, IMEIs, and brands',
      category: 'Navigation',
      icon: Package,
      action: () => onNavigate('products'),
      shortcut: 'Alt + P'
    },
    {
      id: 'add-product',
      title: 'Add New Product to Inventory',
      subtitle: 'Create a new stock item entry with barcoding',
      category: 'Quick Actions',
      icon: PlusCircle,
      action: () => onNavigate('add-product'),
      shortcut: 'Alt + N'
    },
    {
      id: 'finance',
      title: 'Finance & EMI Partners',
      subtitle: 'Manage Bajaj Finserv, TVS, HDB EMI accounts',
      category: 'Navigation',
      icon: Wallet,
      action: () => onNavigate('finance')
    },
    {
      id: 'settings',
      title: 'Store & Account Profile Settings',
      subtitle: 'Manage shop details, GSTIN, user name & security',
      category: 'Navigation',
      icon: Settings,
      action: () => onNavigate('settings'),
      shortcut: 'Alt + S'
    }
  ];

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery('');
        }
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div
        className={`relative z-10 w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isDarkMode
            ? 'bg-slate-900/95 border-slate-800 text-white shadow-slate-950/90'
            : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-sky-900/15'
        }`}
      >
        {/* Search Input Header */}
        <div className="relative border-b border-slate-200/80 dark:border-slate-800 flex items-center px-4 py-3">
          <Search className="w-5 h-5 text-brand-primary flex-shrink-0 mr-3 animate-pulse" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search modules (e.g. Cash Book, Bill, Add Product)..."
            className="w-full bg-transparent text-sm font-extrabold focus:outline-none placeholder:text-slate-400 placeholder:font-semibold"
          />
          <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
            <span className="px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700">
              ESC
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Command Items List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Command className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-500">No matching command found for "{query}"</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'btn-gradient-primary text-white shadow-md shadow-brand-primary/20 scale-[1.005]'
                      : isDarkMode
                      ? 'hover:bg-slate-800/80 text-slate-300'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                        isSelected
                          ? 'bg-white/20 border-white/30 text-white'
                          : 'bg-sky-50 dark:bg-sky-950/60 border-sky-200/60 dark:border-sky-800/60 text-brand-primary'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs sm:text-sm font-black truncate">{item.title}</h4>
                        <span
                          className={`px-1.5 py-0.2 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {item.category}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] font-semibold truncate ${
                          isSelected ? 'text-white/80' : 'text-slate-400'
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    {item.shortcut && (
                      <span
                        className={`hidden sm:inline-block px-2 py-0.5 rounded-lg border text-[10px] font-mono font-extrabold ${
                          isSelected
                            ? 'bg-white/20 border-white/30 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        {item.shortcut}
                      </span>
                    )}
                    <ArrowRight
                      className={`w-4 h-4 transition-transform ${
                        isSelected ? 'translate-x-1 text-white' : 'opacity-0'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="px-1.5 py-0.5 rounded border text-[9px] font-mono bg-slate-100 dark:bg-slate-800">↑↓</span>
              <span>Navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="px-1.5 py-0.5 rounded border text-[9px] font-mono bg-slate-100 dark:bg-slate-800">↵</span>
              <span>Select</span>
            </span>
          </div>
          <div className="flex items-center space-x-1 text-brand-primary font-bold">
            <Command className="w-3 h-3" />
            <span>DukaanPro Quick Command</span>
          </div>
        </div>
      </div>
    </div>
  );
};
