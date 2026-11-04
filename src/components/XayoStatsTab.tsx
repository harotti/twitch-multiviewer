import React, { useState, useEffect, useMemo } from 'react';
import {
  XayoWatchtimeEntry,
  XayoPeriod,
  TwitchUser,
  TwitchChannelInfo,
} from '../types';
import {
  fetchXayoWatchtime,
  formatMinutes,
  formatFollowedDate,
  formatRelativeLastSeen,
} from '../services/xayoApi';
import { LiveStreamData } from '../services/twitchApi';
import {
  Clock,
  Search,
  ExternalLink,
  Play,
  Check,
  TrendingUp,
  Heart,
  Download,
  RotateCcw,
  User,
  Shield,
} from 'lucide-react';

interface XayoStatsTabProps {
  currentUser: TwitchUser | null;
  followedChannels: TwitchChannelInfo[];
  moderatedChannels?: TwitchChannelInfo[];
  liveStreams: Record<string, LiveStreamData>;
  activeChannels: string[];
  onAddChannel: (channel: string) => void;
  onRemoveChannel: (channel: string) => void;
  onOpenModView?: (channel: string) => void;
  onLogin?: () => void;
  lang?: 'pl' | 'en';
}

type SortField = 'time' | 'lastSeen' | 'followed' | 'alpha';

export function XayoStatsTab({
  currentUser,
  followedChannels,
  moderatedChannels = [],
  liveStreams,
  activeChannels,
  onAddChannel,
  onRemoveChannel,
  onOpenModView,
  onLogin,
  lang = 'pl',
}: XayoStatsTabProps) {
  // Analyzed user: automatically uses logged-in user, or saved user in localStorage, or empty
  const [analyzedUser, setAnalyzedUser] = useState<string>(() => {
    return currentUser?.login || localStorage.getItem('xayo_analyzed_user') || '';
  });
  const [userInput, setUserInput] = useState<string>(analyzedUser);
  const [period, setPeriod] = useState<XayoPeriod>('all');
  const [entries, setEntries] = useState<XayoWatchtimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('time');

  // If user logs in or currentUser changes, auto-switch to their account
  useEffect(() => {
    if (currentUser?.login) {
      setAnalyzedUser(currentUser.login);
      setUserInput(currentUser.login);
      localStorage.setItem('xayo_analyzed_user', currentUser.login);
    } else {
      const saved = localStorage.getItem('xayo_analyzed_user');
      if (saved && !analyzedUser) {
        setAnalyzedUser(saved);
        setUserInput(saved);
      }
    }
  }, [currentUser?.login]);

  const followedMap = useMemo(() => {
    const map = new Map<string, TwitchChannelInfo>();
    followedChannels.forEach((ch) => {
      map.set(ch.broadcaster_login.toLowerCase(), ch);
    });
    return map;
  }, [followedChannels]);

  const activeSet = useMemo(() => {
    return new Set(activeChannels.map((c) => c.toLowerCase()));
  }, [activeChannels]);

  const moderatedSet = useMemo(() => {
    return new Set((moderatedChannels || []).map((c) => c.broadcaster_login.toLowerCase()));
  }, [moderatedChannels]);

  // Fetch watchtime data from xayo.pl
  const loadData = async (userToFetch: string, selectedPeriod: XayoPeriod) => {
    const clean = userToFetch.trim().toLowerCase();
    if (!clean) {
      setEntries([]);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchXayoWatchtime(clean, selectedPeriod, 'twitch');
      setEntries(data);
    } catch (err: any) {
      console.error('Failed to fetch xayo watchtime', err);
      setErrorMessage(
        err.message ||
          (lang === 'pl'
            ? 'Nie udało się pobrać statystyk z xayo.pl.'
            : 'Failed to fetch statistics from xayo.pl.')
      );
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(analyzedUser, period);
  }, [analyzedUser, period]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = userInput.trim().toLowerCase();
    if (!clean) return;
    setAnalyzedUser(clean);
    localStorage.setItem('xayo_analyzed_user', clean);
  };

  const totalMinutes = useMemo(() => {
    return entries.reduce((acc, curr) => acc + (curr.minutes || 0), 0);
  }, [entries]);

  const maxMinutesInList = useMemo(() => {
    if (entries.length === 0) return 1;
    return Math.max(...entries.map((e) => e.minutes || 0), 1);
  }, [entries]);

  const totalFormatted = formatMinutes(totalMinutes, lang);
  const topStreamer = entries[0];

  // Filter & Sort
  const processedEntries = useMemo(() => {
    let list = [...entries];

    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase();
      list = list.filter((item) => item.streamerName.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortField === 'time') return (b.minutes || 0) - (a.minutes || 0);
      if (sortField === 'lastSeen') {
        const timeA = new Date(a.lastSeen.replace(' ', 'T')).getTime() || 0;
        const timeB = new Date(b.lastSeen.replace(' ', 'T')).getTime() || 0;
        return timeB - timeA;
      }
      if (sortField === 'followed') {
        const followA = followedMap.get(a.streamerName.toLowerCase())?.followed_at;
        const followB = followedMap.get(b.streamerName.toLowerCase())?.followed_at;
        const dateA = followA ? new Date(followA).getTime() : 0;
        const dateB = followB ? new Date(followB).getTime() : 0;
        return dateA - dateB;
      }
      if (sortField === 'alpha') return a.streamerName.localeCompare(b.streamerName);
      return 0;
    });

    return list;
  }, [entries, filterQuery, sortField, followedMap]);

  // Export
  const handleExport = (type: 'csv' | 'json') => {
    if (type === 'json') {
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(
          JSON.stringify(
            {
              analyzedUser,
              period,
              totalMinutes,
              totalHours: totalFormatted.totalHours,
              exportedAt: new Date().toISOString(),
              streamers: entries.map((e) => ({
                ...e,
                followed_at: followedMap.get(e.streamerName.toLowerCase())?.followed_at || null,
              })),
            },
            null,
            2
          )
        );
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `xayo-stats-${analyzedUser}-${period}-${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      const headers = ['Streamer', 'Minutes', 'Hours', 'Percentage', 'LastSeen', 'FollowedAt', 'FollowDuration'];
      const rows = entries.map((e) => {
        const follow = formatFollowedDate(followedMap.get(e.streamerName.toLowerCase())?.followed_at, lang);
        const percent = totalMinutes > 0 ? ((e.minutes / totalMinutes) * 100).toFixed(1) : '0';
        return [
          e.streamerName,
          e.minutes,
          Math.floor(e.minutes / 60),
          `${percent}%`,
          e.lastSeen,
          follow ? follow.dateFormatted : 'Not followed',
          follow ? follow.durationText : 'N/A',
        ];
      });
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `xayo-stats-${analyzedUser}-${period}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col p-3 space-y-3 text-xs">
      {/* Chatter Switcher & Search Bar */}
      <div className="bg-[#202025] border border-zinc-800 rounded-xl p-3 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <TrendingUp className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="font-bold text-white truncate text-xs">
              {lang === 'pl' ? 'Statystyki Czasu' : 'Watch Time'}
            </span>
          </div>

          <a
            href={analyzedUser ? `https://xayo.pl/${encodeURIComponent(analyzedUser)}` : 'https://xayo.pl'}
            target="_blank"
            rel="noopener noreferrer"
            title={lang === 'pl' ? 'Otwórz na xayo.pl' : 'Open on xayo.pl'}
            className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold transition-colors shrink-0"
          >
            <span>{analyzedUser ? `xayo.pl/${analyzedUser}` : 'xayo.pl'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Search input with integrated submit & refresh */}
        <form onSubmit={handleSearchSubmit} className="flex gap-1.5 items-center">
          <div className="relative flex-1">
            <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={lang === 'pl' ? 'Wpisz nick na Twitchu...' : 'Enter Twitch username...'}
              className="w-full bg-[#141416] border border-zinc-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-purple-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            title={lang === 'pl' ? 'Szukaj użytkownika' : 'Search user'}
            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'pl' ? 'Szukaj' : 'Search'}</span>
          </button>

          <button
            type="button"
            onClick={() => loadData(analyzedUser, period)}
            title={lang === 'pl' ? 'Odśwież dane' : 'Refresh data'}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors shrink-0"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </form>
      </div>

      {/* Period Selector Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-[#141416] p-1 rounded-xl border border-zinc-800 text-center font-medium text-[11px]">
        <button
          onClick={() => setPeriod('all')}
          className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
            period === 'all'
              ? 'bg-purple-600 text-white font-bold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {lang === 'pl' ? 'Cały czas' : 'All time'}
        </button>
        <button
          onClick={() => setPeriod('365d')}
          className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
            period === '365d'
              ? 'bg-purple-600 text-white font-bold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {lang === 'pl' ? '365 dni' : '365 days'}
        </button>
        <button
          onClick={() => setPeriod('30d')}
          className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
            period === '30d'
              ? 'bg-purple-600 text-white font-bold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {lang === 'pl' ? '30 dni' : '30 days'}
        </button>
      </div>

      {/* Summary KPI Cards */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-[#202025] border border-zinc-800/90 rounded-xl">
            <span className="text-[10px] text-zinc-400 block font-medium">
              {lang === 'pl' ? 'Łączny czas' : 'Total watch time'}
            </span>
            <div className="text-sm font-extrabold text-emerald-400 mt-0.5">
              {totalFormatted.formatted}
            </div>
            {totalFormatted.daysSubtitle && (
              <span className="text-[10px] text-zinc-500 block truncate">
                {totalFormatted.daysSubtitle}
              </span>
            )}
          </div>

          <div className="p-2.5 bg-[#202025] border border-zinc-800/90 rounded-xl">
            <span className="text-[10px] text-zinc-400 block font-medium">
              {lang === 'pl' ? 'Oglądane kanały' : 'Tracked creators'}
            </span>
            <div className="text-sm font-extrabold text-purple-400 mt-0.5">
              {entries.length} {lang === 'pl' ? 'twórców' : 'creators'}
            </div>
            {topStreamer && (
              <span className="text-[10px] text-zinc-400 block truncate">
                Top: <strong className="text-zinc-200">{topStreamer.streamerName}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filter and Sort Toolbar */}
      {entries.length > 0 && (
        <div className="flex gap-1.5 pt-0.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={lang === 'pl' ? 'Filtruj listę...' : 'Filter list...'}
              className="w-full bg-[#18181b] border border-zinc-800 rounded-lg pl-7 pr-2 py-1.5 text-[11px] text-white placeholder-zinc-500 focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="bg-[#18181b] border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-zinc-300 focus:outline-hidden focus:border-purple-500 cursor-pointer shrink-0"
          >
            <option value="time">{lang === 'pl' ? 'Czas: Max' : 'Time: Max'}</option>
            <option value="lastSeen">{lang === 'pl' ? 'Ostatnio widziany' : 'Last seen'}</option>
            <option value="followed">{lang === 'pl' ? 'Staż follow' : 'Follow duration'}</option>
            <option value="alpha">{lang === 'pl' ? 'A-Z' : 'A-Z'}</option>
          </select>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 text-center space-y-2">
          <RotateCcw className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
          <p className="text-zinc-400 text-xs">
            {lang === 'pl'
              ? `Pobieranie statystyk xayo.pl dla "${analyzedUser}"...`
              : `Loading xayo.pl stats for "${analyzedUser}"...`}
          </p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && !isLoading && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-center space-y-1">
          <p className="text-red-300 font-semibold text-xs">{errorMessage}</p>
          <p className="text-[11px] text-zinc-400">
            {lang === 'pl'
              ? 'Sprawdź poprawność nicku lub wpisz innego użytkownika.'
              : 'Verify the username or try another chatter.'}
          </p>
        </div>
      )}

      {/* Welcome State when no user is entered/logged in */}
      {!analyzedUser && !isLoading && (
        <div className="p-6 text-center space-y-3 bg-[#1e1e24] rounded-xl border border-zinc-800">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center mx-auto">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              {lang === 'pl' ? 'Wpisz swój nick z Twitcha' : 'Enter your Twitch username'}
            </h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              {lang === 'pl'
                ? 'Wpisz powyżej swój nick (lub zaloguj się przez Twitch), aby automatycznie sprawdzić statystyki Twojego czasu oglądania streamerów z bazy xayo.pl.'
                : 'Enter your Twitch username above or log in to view your watch time analytics from xayo.pl.'}
            </p>
          </div>
          {onLogin && !currentUser && (
            <button
              onClick={onLogin}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              {lang === 'pl' ? 'Zaloguj się przez Twitch' : 'Log in with Twitch'}
            </button>
          )}
        </div>
      )}

      {/* Empty State when user has 0 records */}
      {!isLoading && !errorMessage && analyzedUser && entries.length === 0 && (
        <div className="p-6 text-center text-zinc-500 space-y-2 bg-[#202025] rounded-xl border border-zinc-800">
          <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-xs font-semibold text-zinc-300">
            {lang === 'pl'
              ? `Brak danych dla "${analyzedUser}" w wybranym okresie`
              : `No records found for "${analyzedUser}" in this period`}
          </p>
          <p className="text-[11px] text-zinc-500">
            {lang === 'pl'
              ? 'Upewnij się, że nick jest poprawny lub wybierz okres "Cały czas".'
              : 'Verify the username or select "All time".'}
          </p>
        </div>
      )}

      {/* Streamers List with 2-Tier Clean Layout (No Overlapping Buttons!) */}
      {!isLoading && processedEntries.length > 0 && (
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 font-medium">
            <span>
              {lang === 'pl' ? 'Twórcy' : 'Creators'} ({processedEntries.length})
            </span>
            <span className="text-[10px] text-zinc-500">
              {lang === 'pl' ? 'Ranking oglądalności' : 'Ranking'}
            </span>
          </div>

          <ul className="space-y-2">
            {processedEntries.map((item, idx) => {
              const lowerName = item.streamerName.toLowerCase();
              const isWatching = activeSet.has(lowerName);
              const isModerator = moderatedSet.has(lowerName);
              const live = liveStreams[lowerName];
              const followedInfo = followedMap.get(lowerName);
              const followData = formatFollowedDate(followedInfo?.followed_at, lang);
              const timeStats = formatMinutes(item.minutes, lang);
              const lastSeenText = formatRelativeLastSeen(item.lastSeen, lang);
              const percentageOfMax = Math.min(100, Math.max(3, (item.minutes / maxMinutesInList) * 100));
              const percentageOfTotal =
                totalMinutes > 0 ? ((item.minutes / totalMinutes) * 100).toFixed(1) : '0';

              let rankBadgeClass = 'bg-zinc-800 text-zinc-400';
              if (idx === 0) rankBadgeClass = 'bg-amber-500 text-black font-extrabold';
              else if (idx === 1) rankBadgeClass = 'bg-slate-300 text-black font-extrabold';
              else if (idx === 2) rankBadgeClass = 'bg-amber-700 text-white font-extrabold';

              return (
                <li
                  key={lowerName}
                  className={`p-2.5 rounded-xl border transition-all relative overflow-hidden flex flex-col gap-2 ${
                    isWatching
                      ? 'bg-purple-950/40 border-purple-500/80 shadow-md'
                      : 'bg-[#1e1e24] hover:bg-[#25252e] border-zinc-800'
                  }`}
                >
                  {/* Background progress bar indicator */}
                  <div
                    className="absolute inset-y-0 left-0 bg-purple-600/10 pointer-events-none transition-all duration-300"
                    style={{ width: `${percentageOfMax}%` }}
                  />

                  {/* TIER 1: Streamer Identity & Total Time */}
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Rank # */}
                      <span className={`w-5 h-5 rounded text-[10px] flex items-center justify-center shrink-0 ${rankBadgeClass}`}>
                        #{idx + 1}
                      </span>

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={item.avatarUrl || 'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517eb-aca7-43a6-8fc7-e9a8f4c3a501-profile_image-300x300.png'}
                          alt={item.streamerName}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-700 bg-zinc-800"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517eb-aca7-43a6-8fc7-e9a8f4c3a501-profile_image-300x300.png';
                          }}
                        />
                        {live && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-600 border border-[#18181b] rounded-full animate-pulse"
                            title="Live"
                          />
                        )}
                      </div>

                      {/* Streamer Name & Live Badge */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-white text-xs truncate capitalize">
                            {item.streamerName}
                          </span>
                          {live && (
                            <span className="text-[9px] px-1 py-0.2 bg-red-600/90 text-white font-bold rounded uppercase">
                              Live
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Time Stat */}
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-400 text-xs">
                        {timeStats.formatted}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {percentageOfTotal}% {lang === 'pl' ? 'czasu' : 'of total'}
                      </div>
                    </div>
                  </div>

                  {/* TIER 2: Follow Info & Action Buttons (Separated, No Collisions!) */}
                  <div className="relative flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/60 text-[11px]">
                    {/* Left: Follow badge or last active text */}
                    <div className="min-w-0 flex-1 truncate">
                      {followData ? (
                        <div
                          className="flex items-center gap-1 text-[10px] text-purple-300 font-medium truncate"
                          title={`Zaobserwowano ${followData.dateFormatted}`}
                        >
                          <Heart className="w-3 h-3 fill-purple-400 text-purple-400 shrink-0" />
                          <span className="truncate">
                            {lang === 'pl' ? `Od: ${followData.durationText}` : `Follow: ${followData.durationText}`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-500 truncate block">
                          {lang === 'pl' ? 'Ostatnio:' : 'Seen:'} {lastSeenText}
                        </span>
                      )}
                    </div>

                    {/* Right: Mod View & Watch Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isModerator && (
                        <button
                          type="button"
                          onClick={() => onOpenModView ? onOpenModView(lowerName) : null}
                          title={lang === 'pl' ? `Włącz Panel Moderatora dla ${item.streamerName}` : `Open Mod View for ${item.streamerName}`}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Shield className="w-3 h-3 text-amber-400" />
                          <span>Mod</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (isWatching) {
                            onRemoveChannel(lowerName);
                          } else {
                            onAddChannel(lowerName);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                          isWatching
                            ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-xs'
                        }`}
                      >
                        {isWatching ? (
                          <>
                            <Check className="w-3 h-3 text-purple-300" />
                            <span>{lang === 'pl' ? 'W siatce' : 'In Grid'}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>{lang === 'pl' ? 'Oglądaj' : 'Watch'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Export Action Buttons */}
      {entries.length > 0 && (
        <div className="pt-1.5 border-t border-zinc-800 flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>JSON</span>
          </button>
        </div>
      )}
    </div>
  );
}
