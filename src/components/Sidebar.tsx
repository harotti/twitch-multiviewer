import React, { useState } from 'react';
import {
  TwitchUser,
  TwitchChannelInfo,
  ChannelWatchStat,
  StreamPreset,
} from '../types';
import { formatTime } from '../hooks/useWatchTimeTracker';
import { LiveStreamData, openTwitchModView } from '../services/twitchApi';
import { XayoStatsTab } from './XayoStatsTab';
import {
  Shield,
  Heart,
  Clock,
  Plus,
  Play,
  Check,
  RotateCcw,
  Trash2,
  Download,
  Settings as SettingsIcon,
  Search,
  Bookmark,
  Tv,
  LogOut,
  Radio,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  user: TwitchUser | null;
  token: string | null;
  moderatedChannels: TwitchChannelInfo[];
  followedChannels: TwitchChannelInfo[];
  liveStreams: Record<string, LiveStreamData>;
  activeChannels: string[];
  watchStats: Record<string, ChannelWatchStat>;
  presets: StreamPreset[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onAddChannel: (channel: string) => void;
  onRemoveChannel: (channel: string) => void;
  onResetStats: () => void;
  onResetChannelStat: (channel: string) => void;
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: StreamPreset) => void;
  onDeletePreset: (id: string) => void;
  onOpenSettings: () => void;
  isLoadingData: boolean;
  onRefreshChannels: () => void;
  lang?: 'pl' | 'en';
}

type TabKey = 'channels' | 'stats' | 'presets';

export function Sidebar({
  user,
  token,
  moderatedChannels,
  followedChannels,
  liveStreams,
  activeChannels,
  watchStats,
  presets,
  isOpen,
  onToggleOpen,
  onLogin,
  onLogout,
  onAddChannel,
  onRemoveChannel,
  onResetStats,
  onResetChannelStat,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onOpenSettings,
  isLoadingData,
  onRefreshChannels,
  lang = 'pl',
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('channels');
  const [manualInput, setManualInput] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [newPresetName, setNewPresetName] = useState('');

  const handleAddSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let cleaned = manualInput.trim();
    if (!cleaned) return;

    // Handle twitch.tv URL paste
    if (cleaned.includes('twitch.tv/')) {
      const match = cleaned.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
      if (match && match[1]) {
        cleaned = match[1];
      }
    }

    onAddChannel(cleaned.toLowerCase());
    setManualInput('');
  };

  const handleSavePresetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim() || activeChannels.length === 0) return;
    onSavePreset(newPresetName.trim());
    setNewPresetName('');
  };

  const activeChannelsSet = new Set(activeChannels.map((c) => c.toLowerCase()));

  // Filter channels
  const filterQuery = channelFilter.trim().toLowerCase();
  const filteredMod = moderatedChannels.filter(
    (c) =>
      c.broadcaster_name.toLowerCase().includes(filterQuery) ||
      c.broadcaster_login.toLowerCase().includes(filterQuery)
  );
  const filteredFollow = followedChannels.filter(
    (c) =>
      c.broadcaster_name.toLowerCase().includes(filterQuery) ||
      c.broadcaster_login.toLowerCase().includes(filterQuery)
  );


  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs"
          onClick={onToggleOpen}
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-40 w-80 bg-[#18181b] border-r border-[#27272a] flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-80'
        } ${!isOpen ? 'lg:hidden' : ''}`}
      >
        {/* App Title & Auth Bar */}
        <div className="p-4 border-b border-[#27272a] bg-[#1f1f23]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-700 to-purple-500 flex items-center justify-center shadow-md shadow-purple-950/50">
                <Tv className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-wide text-white leading-tight">
                  Twitch Tracker
                </h1>
                <span className="text-[10px] text-purple-400 font-medium">Multi Viewer Pro</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onOpenSettings}
                title={lang === 'pl' ? 'Ustawienia' : 'Settings'}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleOpen}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 lg:hidden"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User Account / Login State */}
          {token && user ? (
            <div className="flex items-center justify-between bg-[#121214] p-2.5 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={user.profile_image_url}
                  alt={user.display_name}
                  className="w-7 h-7 rounded-full border border-purple-500 shrink-0 object-cover"
                />
                <div className="truncate">
                  <div className="text-xs font-semibold text-white truncate flex items-center gap-1">
                    {user.display_name}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">@{user.login}</div>
                </div>
              </div>
              <button
                onClick={onLogout}
                title={lang === 'pl' ? 'Wyloguj' : 'Logout'}
                className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-[#121214] p-2.5 rounded-xl border border-zinc-800">
              <p className="text-[11px] text-zinc-400 mb-2 leading-relaxed">
                {lang === 'pl'
                  ? 'Zaloguj się, aby automatycznie pobrać swoje kanały i moderatora.'
                  : 'Log in to fetch your followed and moderated channels.'}
              </p>
              <button
                onClick={onLogin}
                className="w-full bg-[#9146ff] hover:bg-[#772ce8] text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-purple-950/40 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M2.149 0l-1.612 4.16v16.035h5.362v3.805h3.83l3.778-3.805h4.825l5.668-5.668V0H2.149zm17.917 13.095l-3.23 3.232H11.5l-3.284 3.285v-3.285H4.632V2.148h15.434v10.947z" />
                  <polygon points="16.08 5.733 13.937 5.733 13.937 11.454 16.08 11.454" />
                  <polygon points="11.002 5.733 8.86 5.733 8.86 11.454 11.002 11.454" />
                </svg>
                {lang === 'pl' ? 'Zaloguj z Twitch' : 'Log in with Twitch'}
              </button>
            </div>
          )}
        </div>

        {/* Manual Channel Adder */}
        <div className="p-3 border-b border-[#27272a] bg-[#161619]">
          <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
            {lang === 'pl' ? 'Dodaj dowolny kanał' : 'Add Any Channel'}
          </label>
          <form onSubmit={handleAddSubmit} className="flex gap-1.5">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={lang === 'pl' ? 'Nazwa kanału lub link...' : 'Channel name or link...'}
              className="flex-1 bg-[#202025] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              title={lang === 'pl' ? 'Dodaj do podglądu' : 'Add to viewer'}
              disabled={!manualInput.trim()}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 border-b border-[#27272a] bg-[#18181b] text-xs font-medium">
          <button
            onClick={() => setActiveTab('channels')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'channels'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{lang === 'pl' ? 'Kanały' : 'Channels'}</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'stats'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{lang === 'pl' ? 'Czas (xayo)' : 'Watchtime'}</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'presets'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{lang === 'pl' ? 'Zestawy' : 'Presets'}</span>
          </button>
        </div>

        {/* Tab 1: Channels Feed (Moderated & Followed) */}
        {activeTab === 'channels' && (
          <div className="flex-1 overflow-y-auto flex flex-col p-3 space-y-4">
            {/* Search filter input */}
            {(moderatedChannels.length > 0 || followedChannels.length > 0) && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  placeholder={lang === 'pl' ? 'Szukaj na liście...' : 'Filter channels...'}
                  className="w-full bg-[#202025] pl-8 pr-3 py-1.5 rounded-lg text-xs text-white placeholder-zinc-500 border border-zinc-800 focus:outline-hidden focus:border-purple-500"
                />
              </div>
            )}

            {/* Refresh Channels Button */}
            {token && (
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span className="text-[11px] text-zinc-500">
                  {lang === 'pl' ? 'Twoje kanały z Twitcha' : 'Your Twitch channels'}
                </span>
                <button
                  onClick={onRefreshChannels}
                  disabled={isLoadingData}
                  className="hover:text-purple-400 flex items-center gap-1 text-[11px] transition-colors"
                  title={lang === 'pl' ? 'Odśwież kanały' : 'Refresh channels'}
                >
                  <RotateCcw className={`w-3 h-3 ${isLoadingData ? 'animate-spin' : ''}`} />
                  <span>{lang === 'pl' ? 'Odśwież' : 'Refresh'}</span>
                </button>
              </div>
            )}

            {/* Moderated Channels */}
            {moderatedChannels.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{lang === 'pl' ? 'Moderowane' : 'Moderated'}</span>
                  <span className="text-[10px] text-zinc-500 ml-auto">({filteredMod.length})</span>
                </div>
                <ul className="space-y-1">
                  {filteredMod.map((ch) => {
                    const isWatching = activeChannelsSet.has(ch.broadcaster_login.toLowerCase());
                    const live = liveStreams[ch.broadcaster_login.toLowerCase()];
                    return (
                      <li
                        key={ch.broadcaster_id}
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors border ${
                          isWatching
                            ? 'bg-purple-950/40 border-purple-600/60'
                            : 'bg-[#202025] hover:bg-[#282830] border-zinc-800/60'
                        }`}
                      >
                        <div className="min-w-0 mr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-white truncate">
                              {ch.broadcaster_name}
                            </span>
                            {live && (
                              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Live" />
                            )}
                          </div>
                          {live?.game_name && (
                            <span className="text-[10px] text-zinc-500 block truncate">
                              {live.game_name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openTwitchModView(ch.broadcaster_login);
                            }}
                            title={
                              lang === 'pl'
                                ? `Włącz Panel Moderatora (Mod View) dla ${ch.broadcaster_name}`
                                : `Open Moderator View for ${ch.broadcaster_name}`
                            }
                            className="text-xs px-2 py-1 rounded font-semibold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Shield className="w-3 h-3 text-amber-400" />
                            <span>{lang === 'pl' ? 'Panel mod.' : 'Mod View'}</span>
                          </button>

                          <button
                            onClick={() => {
                              if (isWatching) {
                                onRemoveChannel(ch.broadcaster_login);
                              } else {
                                onAddChannel(ch.broadcaster_login);
                              }
                            }}
                            className={`text-xs px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                              isWatching
                                ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                                : 'bg-purple-600 hover:bg-purple-500 text-white'
                            }`}
                          >
                            {isWatching ? (
                              <>
                                <Check className="w-3 h-3 text-purple-300" />
                                <span>{lang === 'pl' ? 'Aktywny' : 'Active'}</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                <span>{lang === 'pl' ? 'Oglądaj' : 'Watch'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Followed Channels */}
            {followedChannels.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 mb-2">
                  <Heart className="w-3.5 h-3.5 fill-purple-400/20" />
                  <span>{lang === 'pl' ? 'Obserwowane' : 'Followed'}</span>
                  <span className="text-[10px] text-zinc-500 ml-auto">({filteredFollow.length})</span>
                </div>
                <ul className="space-y-1">
                  {filteredFollow.map((ch) => {
                    const isWatching = activeChannelsSet.has(ch.broadcaster_login.toLowerCase());
                    const live = liveStreams[ch.broadcaster_login.toLowerCase()];
                    return (
                      <li
                        key={ch.broadcaster_id}
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors border ${
                          isWatching
                            ? 'bg-purple-950/40 border-purple-600/60'
                            : 'bg-[#202025] hover:bg-[#282830] border-zinc-800/60'
                        }`}
                      >
                        <div className="min-w-0 mr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-white truncate">
                              {ch.broadcaster_name}
                            </span>
                            {live && (
                              <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                {live.viewer_count > 0 ? `${live.viewer_count.toLocaleString()}` : 'Live'}
                              </span>
                            )}
                          </div>
                          {live?.game_name && (
                            <span className="text-[10px] text-zinc-500 block truncate">
                              {live.game_name}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (isWatching) {
                              onRemoveChannel(ch.broadcaster_login);
                            } else {
                              onAddChannel(ch.broadcaster_login);
                            }
                          }}
                          className={`text-xs px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                            isWatching
                              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                              : 'bg-purple-600 hover:bg-purple-500 text-white'
                          }`}
                        >
                          {isWatching ? (
                            <>
                              <Check className="w-3 h-3 text-purple-300" />
                              <span>{lang === 'pl' ? 'Aktywny' : 'Active'}</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>{lang === 'pl' ? 'Oglądaj' : 'Watch'}</span>
                            </>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* When not logged in or no channels */}
            {!token && (
              <div className="p-4 bg-[#202025] border border-zinc-800 rounded-xl text-center">
                <Tv className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-xs text-zinc-300 font-medium mb-1">
                  {lang === 'pl' ? 'Oglądaj bez logowania' : 'Watch without login'}
                </p>
                <p className="text-[11px] text-zinc-500 mb-3">
                  {lang === 'pl'
                    ? 'Wpisz dowolnego streamera powyżej, aby od razu rozpocząć oglądanie.'
                    : 'Type any channel above to start watching right away.'}
                </p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {['eslcs', 'shroud', 'riotgames', 'xmerghani', 'izakooo'].map((quick) => (
                    <button
                      key={quick}
                      onClick={() => onAddChannel(quick)}
                      className="text-[11px] bg-zinc-800 hover:bg-purple-600 text-zinc-300 hover:text-white px-2 py-1 rounded transition-colors"
                    >
                      +{quick}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Xayo.pl Watch Time & Follow Duration */}
        {activeTab === 'stats' && (
          <XayoStatsTab
            currentUser={user}
            followedChannels={followedChannels}
            moderatedChannels={moderatedChannels}
            liveStreams={liveStreams}
            activeChannels={activeChannels}
            onAddChannel={onAddChannel}
            onRemoveChannel={onRemoveChannel}
            lang={lang}
          />
        )}

        {/* Tab 3: Presets (Zapisane zestawy) */}
        {activeTab === 'presets' && (
          <div className="flex-1 overflow-y-auto flex flex-col p-3 space-y-4">
            {/* Save current setup as preset */}
            <div className="p-3 bg-[#202025] border border-zinc-800 rounded-xl">
              <span className="text-xs font-semibold text-zinc-200 block mb-1">
                {lang === 'pl' ? 'Zapisz obecny zestaw' : 'Save current layout'}
              </span>
              <p className="text-[11px] text-zinc-500 mb-2">
                {activeChannels.length === 0
                  ? lang === 'pl'
                    ? 'Otwórz co najmniej 1 stream, aby zapisać.'
                    : 'Open at least 1 stream to save.'
                  : `${activeChannels.length} ${lang === 'pl' ? 'aktywnych kanałów' : 'active channels'}`}
              </p>
              <form onSubmit={handleSavePresetSubmit} className="flex gap-1.5">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder={lang === 'pl' ? 'np. Ulubione, Turniej CS' : 'e.g. Esports, Chill'}
                  disabled={activeChannels.length === 0}
                  className="flex-1 bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-purple-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!newPresetName.trim() || activeChannels.length === 0}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0"
                >
                  {lang === 'pl' ? 'Zapisz' : 'Save'}
                </button>
              </form>
            </div>

            {/* Presets List */}
            <div>
              <span className="text-xs font-semibold text-zinc-400 block mb-2">
                {lang === 'pl' ? 'Twoje Zestawy' : 'Saved Presets'}
              </span>

              {presets.length === 0 ? (
                <div className="p-5 text-center text-zinc-500 text-xs">
                  {lang === 'pl'
                    ? 'Brak zapisanych zestawów. Możesz zapisać układ streamów i włączać go jednym kliknięciem!'
                    : 'No saved presets. Save multiple streams together to launch with one click!'}
                </div>
              ) : (
                <ul className="space-y-2">
                  {presets.map((preset) => (
                    <li
                      key={preset.id}
                      className="p-2.5 bg-[#202025] border border-zinc-800 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-xs text-white block">
                            {preset.name}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {preset.channels.length} {lang === 'pl' ? 'kanałów' : 'channels'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onLoadPreset(preset)}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{lang === 'pl' ? 'Włącz' : 'Open'}</span>
                          </button>
                          <button
                            onClick={() => onDeletePreset(preset.id)}
                            className="text-zinc-500 hover:text-red-400 p-1 rounded"
                            title={lang === 'pl' ? 'Usuń zestaw' : 'Delete preset'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {preset.channels.map((ch) => (
                          <span
                            key={ch}
                            className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded"
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="p-3 border-t border-[#27272a] bg-[#141416] text-[10px] text-zinc-500 flex items-center justify-between">
          <span>Twitch Multi Viewer & Tracker</span>
          <span className="text-zinc-600">v2.0</span>
        </div>
      </aside>
    </>
  );
}
