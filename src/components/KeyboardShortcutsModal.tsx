import React, { useState } from 'react';
import {
  Keyboard,
  X,
  Search,
  Play,
  Shield,
  Grid,
  Maximize2,
  Menu,
  TrendingUp,
  Settings,
  HelpCircle,
  Command,
} from 'lucide-react';
import { SHORTCUTS_LIST, ShortcutDefinition } from '../hooks/useGlobalKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'pl' | 'en';
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  lang = 'pl',
}: KeyboardShortcutsModalProps) {
  const [filterQuery, setFilterQuery] = useState('');

  if (!isOpen) return null;

  const categories = [
    {
      id: 'playback',
      title: lang === 'pl' ? 'Odtwarzanie i Moderacja' : 'Playback & Moderation',
      icon: Play,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'navigation',
      title: lang === 'pl' ? 'Nawigacja i Układ Siatki' : 'Navigation & Grid Layout',
      icon: Grid,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
    {
      id: 'modals',
      title: lang === 'pl' ? 'Okna i Narzędzia' : 'Modals & Utilities',
      icon: Command,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    },
  ];

  const filteredShortcuts = SHORTCUTS_LIST.filter((s) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    const desc = lang === 'pl' ? s.descriptionPl.toLowerCase() : s.descriptionEn.toLowerCase();
    const key = s.keyLabel.toLowerCase();
    return desc.includes(q) || key.includes(q);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'pl' ? 'Skróty klawiszowe' : 'Keyboard Shortcuts'}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none"
    >
      <div className="w-full max-w-2xl bg-[#18181b] border border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#1f1f23] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/40 flex items-center justify-center shadow-xs">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {lang === 'pl' ? 'Skróty Klawiszowe' : 'Keyboard Shortcuts'}
                </h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/50">
                  Global Hotkeys
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {lang === 'pl'
                  ? 'Steruj odtwarzaniem, siatką streamów i panelami bez używania myszki'
                  : 'Control playback, layouts and panels directly from your keyboard'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title={lang === 'pl' ? 'Zamknij (Esc)' : 'Close (Esc)'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search filter input */}
        <div className="px-5 py-2.5 bg-[#141416] border-b border-zinc-800/80">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={
                lang === 'pl'
                  ? 'Filtruj skróty (np. spacja, siatka, kinowy, mod)...'
                  : 'Filter shortcuts (e.g. space, grid, theater, mod)...'
              }
              className="w-full bg-[#1e1e24] border border-zinc-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-purple-500 transition-colors"
            />
          </div>
        </div>

        {/* Shortcuts List by category */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {categories.map((cat) => {
            const catItems = filteredShortcuts.filter((s) => s.category === cat.id);
            if (catItems.length === 0) return null;
            const IconComponent = cat.icon;

            return (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-zinc-800">
                  <div className={`p-1 rounded-md border ${cat.color}`}>
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-zinc-200 text-xs tracking-wide">
                    {cat.title}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className="px-3.5 py-2.5 bg-[#1e1e24] hover:bg-[#25252e] border border-zinc-800 hover:border-zinc-700 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <span className="text-zinc-300 font-medium leading-relaxed">
                        {lang === 'pl' ? item.descriptionPl : item.descriptionEn}
                      </span>

                      <div className="shrink-0 flex items-center gap-1">
                        {item.keyLabel.split('  lub  ').map((k, idx, arr) => (
                          <React.Fragment key={k}>
                            <kbd className="px-2.5 py-1 rounded-lg bg-[#141416] border border-zinc-700 font-mono text-xs font-bold text-purple-300 shadow-xs">
                              {k}
                            </kbd>
                            {idx < arr.length - 1 && (
                              <span className="text-[10px] text-zinc-500 px-0.5">
                                {lang === 'pl' ? 'lub' : 'or'}
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div className="p-8 text-center text-zinc-500 space-y-1">
              <p className="font-semibold text-zinc-300">
                {lang === 'pl' ? 'Nie znaleziono pasujących skrótów' : 'No matching shortcuts found'}
              </p>
              <p className="text-[11px]">
                {lang === 'pl' ? 'Spróbuj wpisać inne słowo kluczowe.' : 'Try a different keyword.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="px-5 py-3 bg-[#141416] border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>
            {lang === 'pl'
              ? '💡 Skróty są wyłączone podczas wpisywania tekstu w polach wyszukiwania'
              : '💡 Shortcuts are paused while typing in text input fields'}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium transition-colors cursor-pointer"
          >
            {lang === 'pl' ? 'Rozumiem' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
