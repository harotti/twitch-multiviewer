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
  Calendar,
  Sparkles,
  Download,
  RotateCcw,
  User,
  SlidersHorizontal,
  Maximize2,
  Tv,
  Shield,
} from 'lucide-react';
import { openTwitchModView } from '../services/twitchApi';

interface XayoStatsTabProps {
  currentUser: TwitchUser | null;
  followedChannels: TwitchChannelInfo[];
  moderatedChannels?: TwitchChannelInfo[];
  liveStreams: Record<string, LiveStreamData>;
  activeChannels: string[];
  onAddChannel: (channel: string) => void;
  onRemoveChannel: (channel: string) => void;
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
  lang = 'pl',
}: XayoStatsTabProps) {
  // Analyzed user: default to hattoripol or logged-in user
  const [analyzedUser, setAnalyzedUser] = useState<string>(() => {
    return currentUser?.login || 'hattoripol';
  });
  const [userInput, setUserInput] = useState<string>(analyzedUser);
  const [period, setPeriod] = useState<XayoPeriod>('all');
  const [entries, setEntries] = useState<XayoWatchtimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('time');

  // Quick switch if user logs in
  useEffect(() => {
    if (currentUser?.login && analyzedUser === 'hattoripol') {
      setAnalyzedUser(currentUser.login);
      setUserInput(currentUser.login);
    }
  }, [currentUser]);

  // Map followed channels by lowercase broadcaster_login for instant O(1) lookup
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
    if (!clean) return;

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
  };

  // Aggregated Summary
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

    // Filter by name
    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase();
      list = list.filter((item) => item.streamerName.toLowerCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      if (sortField === 'time') {
        return (b.minutes || 0) - (a.minutes || 0);
      }
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
        return dateA - dateB; // earliest followed first
      }
      if (sortField === 'alpha') {
        return a.streamerName.localeCompare(b.streamerName);
      }
      return 0;
    });

    return list;
  }, [entries, filterQuery, sortField, followedMap]);

  // Export to CSV / JSON
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
      const headers = [
        'Streamer',
        'Minutes',
        'Hours',
        'Percentage',
        'LastSeen',
        'FollowedAt',
        'FollowDuration',
      ];
      const rows = entries.map((e) => {
        const follow = formatFollowedDate(
          followedMap.get(e.streamerName.toLowerCase())?.followed_at,
          lang
        );
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
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `xayo-stats-${analyzedUser}-${period}-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col p-3 space-y-3.5 text-xs">
      {/* Chatter Switcher Bar */}
      <div className="bg-[#202025] border border-zinc-800 rounded-xl p-3 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span>{lang === 'pl' ? 'Statystyki Czasu (xayo.pl)' : 'Watch Time Stats (xayo.pl)'}</span>
            </span>
          </div>
          <a
            href={`https://xayo.pl/${analyzedUser}`}
            target="_blank"
            rel="noopener noreferrer"
            title={lang === 'pl' ? 'Otwórz na xayo.pl' : 'Open on xayo.pl'}
            className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
          >
            <span>xayo.pl/{analyzedUser}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Input for user search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
          <div className="relative flex-1">
            <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={lang === 'pl' ? 'Wpisz nick (np. hattoripol)...' : 'Enter username (e.g. hattoripol)...'}
              className="w-full bg-[#141416] border border-zinc-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-purple-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{lang === 'pl' ? 'Szukaj' : 'Search'}</span>
          </button>
        </form>

        {/* Quick chip shortcuts */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] text-zinc-500">
            {lang === 'pl' ? 'Szybki wybór:' : 'Quick:'}
          </span>
          <button
            type="button"
            onClick={() => {
              setAnalyzedUser('hattoripol');
              setUserInput('hattoripol');
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              analyzedUser === 'hattoripol'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            hattoripol
          </button>

          {currentUser?.login && currentUser.login !== 'hattoripol' && (
            <button
              type="button"
              onClick={() => {
                setAnalyzedUser(currentUser.login);
                setUserInput(currentUser.login);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                analyzedUser === currentUser.login
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              Twój nick: {currentUser.login}
            </button>
          )}

          <button
            type="button"
            onClick={() => loadData(analyzedUser, period)}
            title={lang === 'pl' ? 'Odśwież dane' : 'Refresh data'}
            className="ml-auto text-zinc-400 hover:text-purple-300 p-1 rounded transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-[#141416] p-1 rounded-xl border border-zinc-800 text-center font-medium text-[11px]">
        <button
          onClick={() => setPeriod('all')}
          className={`py-1.5 rounded-lg transition-colors ${
            period === 'all'
              ? 'bg-purple-600 text-white font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {lang === 'pl' ? 'Cały czas' : 'All time'}
        </button>
        <button
          onClick={() => setPeriod('365d')}
          className={`py-1.5 rounded-lg transition-colors ${
            period === '365d'
              ? 'bg-purple-600 text-white font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {lang === 'pl' ? 'Ostatni rok (365d)' : 'Past year (365d)'}
        </button>
        <button
          onClick={() => setPeriod('30d')}
          className={`py-1.5 rounded-lg transition-colors ${
            period === '30d'
              ? 'bg-purple-600 text-white font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {lang === 'pl' ? '30 dni' : 'Past 30 days'}
        </button>
      </div>

      {/* Summary KPI Cards */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-[#202025] border border-zinc-800/90 rounded-xl relative overflow-hidden">
            <span className="text-[10px] text-zinc-400 block font-medium">
              {lang === 'pl' ? 'Łączny czas oglądania' : 'Total watch time'}
            </span>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
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
              {lang === 'pl' ? 'Oglądane kanały' : 'Tracked streamers'}
            </span>
            <div className="text-sm font-bold text-purple-400 mt-0.5">
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
        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={lang === 'pl' ? 'Filtruj streamerów...' : 'Filter streamers...'}
                className="w-full bg-[#18181b] border border-zinc-800 rounded-lg pl-7 pr-2.5 py-1.5 text-[11px] text-white placeholder-zinc-500 focus:outline-hidden focus:border-purple-500"
              />
            </div>

            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-[#18181b] border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-hidden focus:border-purple-500 cursor-pointer"
            >
              <option value="time">{lang === 'pl' ? 'Czas: Najwięcej' : 'Watch time: Highest'}</option>
              <option value="lastSeen">{lang === 'pl' ? 'Ostatnio widziany' : 'Last seen'}</option>
              <option value="followed">{lang === 'pl' ? 'Najdłużej obserwowany' : 'Longest followed'}</option>
              <option value="alpha">{lang === 'pl' ? 'Alfabetycznie (A-Z)' : 'Alphabetical'}</option>
            </select>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 text-center space-y-2">
          <RotateCcw className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
          <p className="text-zinc-400 text-xs">
            {lang === 'pl'
              ? `Pobieranie statystyk xayo.pl dla ${analyzedUser}...`
              : `Loading xayo.pl stats for ${analyzedUser}...`}
          </p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && !isLoading && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-center space-y-1">
          <p className="text-red-300 font-semibold text-xs">{errorMessage}</p>
          <p className="text-[11px] text-zinc-400">
            {lang === 'pl'
              ? 'Sprawdź czy nick jest poprawny lub spróbuj wpisać innego użytkownika.'
              : 'Verify the username or try another chatter.'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !errorMessage && entries.length === 0 && (
        <div className="p-6 text-center text-zinc-500 space-y-2 bg-[#202025] rounded-xl border border-zinc-800">
          <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-xs font-semibold text-zinc-300">
            {lang === 'pl' ? 'Brak danych w wybranym okresie' : 'No records found for this period'}
          </p>
          <p className="text-[11px] text-zinc-500">
            {lang === 'pl'
              ? `Użytkownik "${analyzedUser}" może nie mieć zarejestrowanych minut na polskim Twitchu w tym zakresie.`
              : `User "${analyzedUser}" might not have recorded minutes on Polish Twitch.`}
          </p>
        </div>
      )}

      {/* Streamers List */}
      {!isLoading && processedEntries.length > 0 && (
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 font-medium">
            <span>
              {lang === 'pl' ? 'Ranking kanałów' : 'Streamer ranking'} ({processedEntries.length})
            </span>
            <span className="text-[10px] text-zinc-500">
              {lang === 'pl' ? 'Kliknij, aby włączyć stream' : 'Click to watch'}
            </span>
          </div>

          <ul className="space-y-1.5">
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

              // Rank styling
              let rankBadgeClass = 'bg-zinc-800 text-zinc-400';
              if (idx === 0) rankBadgeClass = 'bg-amber-500 text-black font-bold';
              else if (idx === 1) rankBadgeClass = 'bg-slate-300 text-black font-bold';
              else if (idx === 2) rankBadgeClass = 'bg-amber-700 text-white font-bold';

              return (
                <li
                  key={lowerName}
                  className={`p-2.5 rounded-xl border transition-all relative overflow-hidden group select-none ${
                    isWatching
                      ? 'bg-purple-950/40 border-purple-600/70 shadow-sm'
                      : 'bg-[#202025] hover:bg-[#27272e] border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Subtle progress bar in background */}
                  <div
                    className="absolute inset-y-0 left-0 bg-purple-600/10 pointer-events-none transition-all duration-300"
                    style={{ width: `${percentageOfMax}%` }}
                  />

                  <div className="relative flex items-center justify-between gap-2">
                    {/* Left: Rank, Avatar, Name & Follow duration */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rank # */}
                      <span
                        className={`w-5 h-5 rounded-md text-[10px] flex items-center justify-center shrink-0 ${rankBadgeClass}`}
                      >
                        {idx + 1}
                      </span>

                      {/* Streamer Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={item.avatarUrl || 'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517eb-aca7-43a6-8fc7-e9a8f4c3a501-profile_image-300x300.png'}
                          alt={item.streamerName}
                          className="w-9 h-9 rounded-full object-cover border border-zinc-700/80 bg-zinc-800"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517eb-aca7-43a6-8fc7-e9a8f4c3a501-profile_image-300x300.png';
                          }}
                        />
                        {live && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-600 border-2 border-[#202025] rounded-full animate-pulse"
                            title="Live"
                          />
                        )}
                      </div>

                      {/* Names & Follow status */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs truncate capitalize">
                            {item.streamerName}
                          </span>
                          {live && (
                            <span className="text-[9px] px-1 bg-red-600 text-white font-semibold rounded uppercase">
                              Live
                            </span>
                          )}
                        </div>

                        {/* Followed at badge (from Twitch API) */}
                        {followData ? (
                          <div
                            className="flex items-center gap-1 text-[10px] text-purple-300 font-medium truncate mt-0.5"
                            title={`Obserwujesz od ${followData.dateFormatted} (${followData.daysAgo} dni temu)`}
                          >
                            <Heart className="w-2.5 h-2.5 fill-purple-400 text-purple-400 shrink-0" />
                            <span>
                              {lang === 'pl' ? `Od: ${followData.durationText}` : `Followed: ${followData.durationText}`}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5 flex items-center gap-1">
                            <span>{lang === 'pl' ? 'Ostatnio:' : 'Seen:'}</span>
                            <span className="text-zinc-400">{lastSeenText}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Watch Time & Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="font-bold text-zinc-100 text-xs">
                          {timeStats.formatted}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {percentageOfTotal}% {lang === 'pl' ? 'czasu' : 'of total'}
                        </div>
                      </div>

                      {/* Moderator Panel (Mod View) Button */}
                      {isModerator && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTwitchModView(lowerName);
                          }}
                          title={
                            lang === 'pl'
                              ? `Włącz Panel Moderatora dla ${item.streamerName}`
                              : `Open Mod View for ${item.streamerName}`
                          }
                          className="p-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden sm:inline">{lang === 'pl' ? 'Mod' : 'Mod'}</span>
                        </button>
                      )}

                      {/* Add/Remove to Multi-Viewer button */}
                      <button
                        onClick={() => {
                          if (isWatching) {
                            onRemoveChannel(lowerName);
                          } else {
                            onAddChannel(lowerName);
                          }
                        }}
                        title={
                          isWatching
                            ? lang === 'pl'
                              ? 'Usuń z widoku'
                              : 'Remove from grid'
                            : lang === 'pl'
                            ? 'Włącz w Multi Viewerze'
                            : 'Watch in Multi Viewer'
                        }
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                          isWatching
                            ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-xs'
                        }`}
                      >
                        {isWatching ? (
                          <Check className="w-3.5 h-3.5 text-purple-300" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Secondary detail row when hovered */}
                  {followData && (
                    <div className="mt-1.5 pt-1 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="truncate">
                        {lang === 'pl' ? 'Zaobserwowano:' : 'Follow date:'} {followData.dateFormatted}
                      </span>
                      <span className="shrink-0 text-zinc-400">
                        {lang === 'pl' ? 'Aktywność:' : 'Last active:'} {lastSeenText}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Export Action Buttons */}
      {entries.length > 0 && (
        <div className="pt-2 border-t border-zinc-800 flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>Eksport CSV</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>Eksport JSON</span>
          </button>
        </div>
      )}
    </div>
  );
}
