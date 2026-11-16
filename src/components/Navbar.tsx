import React, { useState } from 'react';
import {
  Menu,
  Grid,
  Square,
  Columns2,
  Grid2X2,
  Grid3X3,
  Plus,
  Trash2,
  Languages,
  Settings as SettingsIcon,
  Tv,
  Volume2,
  TrendingUp,
  Keyboard,
} from 'lucide-react';
import { GridMode } from '../types';

interface NavbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeChannelsCount: number;
  gridMode: GridMode;
  onChangeGridMode: (mode: GridMode) => void;
  onAddChannel: (channel: string) => void;
  onClearAllStreams: () => void;
  onOpenSettings: () => void;
  onOpenXayoModal?: () => void;
  onOpenShortcuts?: () => void;
  lang: 'pl' | 'en';
  onToggleLang: () => void;
}

export function Navbar({
  sidebarOpen,
  onToggleSidebar,
  activeChannelsCount,
  gridMode,
  onChangeGridMode,
  onAddChannel,
  onClearAllStreams,
  onOpenSettings,
  onOpenXayoModal,
  onOpenShortcuts,
  lang,
  onToggleLang,
}: NavbarProps) {
  const [navInput, setNavInput] = useState('');

  const handleNavSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let cleaned = navInput.trim();
    if (!cleaned) return;

    if (cleaned.includes('twitch.tv/')) {
      const match = cleaned.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
      if (match && match[1]) {
        cleaned = match[1];
      }
    }

    onAddChannel(cleaned.toLowerCase());
    setNavInput('');
  };

  return (
    <header className="h-14 bg-[#18181b] border-b border-[#27272a] px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 select-none relative z-40">
      {/* Left section: toggle sidebar + logo */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          title={
            sidebarOpen
              ? lang === 'pl'
                ? 'Schowaj panel boczny (Skrót: B)'
                : 'Hide sidebar (Hotkey: B)'
              : lang === 'pl'
                ? 'Pokaż panel boczny (Skrót: B)'
                : 'Show sidebar (Hotkey: B)'
          }
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 font-bold text-white text-sm">
          <span className="text-purple-400">Twitch Multi Viewer</span>
          {activeChannelsCount > 0 && (
            <span className="bg-purple-950/80 border border-purple-500/30 text-purple-300 text-xs px-2 py-0.5 rounded-full font-medium">
              {activeChannelsCount} {lang === 'pl' ? 'aktywne' : 'active'}
            </span>
          )}
        </div>
      </div>

      {/* Middle section: Quick channel adder */}
      <div className="flex-1 max-w-xs sm:max-w-md mx-2">
        <form onSubmit={handleNavSubmit} className="relative flex items-center">
          <input
            type="text"
            value={navInput}
            onChange={(e) => setNavInput(e.target.value)}
            placeholder={
              lang === 'pl'
                ? 'Dodaj kanał (np. xmerghani, shroud)...'
                : 'Add channel (e.g. xmerghani, shroud)...'
            }
            className="w-full bg-[#0e0e10] border border-zinc-700/80 rounded-lg pl-3 pr-9 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!navInput.trim()}
            title={lang === 'pl' ? 'Dodaj stream' : 'Add stream'}
            className="absolute right-1 text-purple-400 hover:text-purple-300 disabled:opacity-30 p-1 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Right section: Grid Layout Buttons & Actions */}
      <div className="flex items-center gap-1.5">
        {/* Layout Mode selector */}
        <div className="hidden md:flex items-center bg-[#121214] p-0.5 rounded-lg border border-zinc-800">
          <button
            onClick={() => onChangeGridMode('auto')}
            title={lang === 'pl' ? 'Auto Grid (Skrót: G przełącza układy)' : 'Auto Grid (Hotkey: G cycles layouts)'}
            className={`p-1.5 rounded text-xs transition-colors ${
              gridMode === 'auto'
                ? 'bg-purple-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChangeGridMode('1x1')}
            title="1x1 (Full)"
            className={`p-1.5 rounded text-xs transition-colors ${
              gridMode === '1x1'
                ? 'bg-purple-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChangeGridMode('1x2')}
            title="1x2 (Side-by-side)"
            className={`p-1.5 rounded text-xs transition-colors ${
              gridMode === '1x2'
                ? 'bg-purple-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Columns2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChangeGridMode('2x2')}
            title="2x2 (Quad)"
            className={`p-1.5 rounded text-xs transition-colors ${
              gridMode === '2x2'
                ? 'bg-purple-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Grid2X2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChangeGridMode('3x2')}
            title="3x2 (6 Streams)"
            className={`p-1.5 rounded text-xs transition-colors ${
              gridMode === '3x2'
                ? 'bg-purple-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>

        {/* Clear all active streams button */}
        {activeChannelsCount > 0 && (
          <button
            onClick={onClearAllStreams}
            title={lang === 'pl' ? 'Zamknij wszystkie streamy' : 'Close all streams'}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors text-xs flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden xl:inline">{lang === 'pl' ? 'Wyczyść' : 'Clear'}</span>
          </button>
        )}

        {/* Open Xayo Stats button */}
        {onOpenXayoModal && (
          <button
            onClick={onOpenXayoModal}
            title={lang === 'pl' ? 'Statystyki czasu xayo.pl (Skrót: X)' : 'xayo.pl watch time stats (Hotkey: X)'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900/90 border border-purple-600/50 text-purple-300 hover:text-white transition-colors text-xs font-semibold cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline">{lang === 'pl' ? 'Statystyki xayo.pl' : 'xayo.pl Stats'}</span>
            <kbd className="hidden xl:inline text-[9px] px-1 rounded bg-purple-900/60 border border-purple-500/40 font-mono text-purple-300">X</kbd>
          </button>
        )}

        {/* Keyboard Shortcuts Dialog button */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            title={lang === 'pl' ? 'Skróty klawiszowe (Skrót: ? lub F1)' : 'Keyboard Shortcuts (Hotkey: ? or F1)'}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}

        {/* Language switch */}
        <button
          onClick={onToggleLang}
          title={lang === 'pl' ? 'Zmień język (PL/EN)' : 'Switch language (PL/EN)'}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          {lang}
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title={lang === 'pl' ? 'Ustawienia aplikacji (Skrót: S)' : 'App Settings (Hotkey: S)'}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
