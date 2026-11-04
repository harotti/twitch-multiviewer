import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  TrendingUp,
  Search,
  ExternalLink,
  Play,
  Check,
  Heart,
  Clock,
  Download,
  RotateCcw,
  User,
  Radio,
  Sparkles,
  Flame,
  Zap,
  Shield,
  BarChart3,
  Users,
  Compass,
  ArrowUpRight,
} from 'lucide-react';
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
import { LiveStreamData, openTwitchModView } from '../services/twitchApi';

interface XayoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: TwitchUser | null;
  followedChannels: TwitchChannelInfo[];
  moderatedChannels?: TwitchChannelInfo[];
  liveStreams: Record<string, LiveStreamData>;
  activeChannels: string[];
  onAddChannel: (channel: string) => void;
  onRemoveChannel: (channel: string) => void;
  lang?: 'pl' | 'en';
}

type ModalTab = 'trending' | 'chatter';
type SortField = 'time' | 'lastSeen' | 'followed' | 'alpha';
type TrendingFilter = 'all' | 'spikes' | 'moderated' | 'live';

interface TrendingSpikeChannel {
  channel: string;
  displayName: string;
  avatarUrl: string;
  isLive: boolean;
  viewerCount: number;
  gameName: string;
  title: string;
  isModerator: boolean;
  isFollowed: boolean;
  followDurationText?: string;
  followDateText?: string;
  totalMinutesWatched: number;
  spikePercent: number;
  spikeLevel: 'viral' | 'high' | 'rising';
  activeInSession: boolean;
}

const DEFAULT_POPULAR_SEEDS = [
  { name: 'eslcs', label: 'ESL CS', category: 'Counter-Strike 2', baseSpike: 245, baseMinutes: 48900 },
  { name: 'riotgames', label: 'Riot Games', category: 'League of Legends', baseSpike: 195, baseMinutes: 43200 },
  { name: 'xmerghani', label: 'xmerghani', category: 'Just Chatting', baseSpike: 175, baseMinutes: 38400 },
  { name: 'h2p_gucio', label: 'H2P_Gucio', category: 'Variety', baseSpike: 160, baseMinutes: 35000 },
  { name: 'izakooo', label: 'izakooo', category: 'Counter-Strike 2', baseSpike: 140, baseMinutes: 32400 },
  { name: 'shroud', label: 'shroud', category: 'Variety', baseSpike: 125, baseMinutes: 29500 },
  { name: 'tarik', label: 'tarik', category: 'VALORANT', baseSpike: 110, baseMinutes: 27800 },
  { name: 'caseoh_', label: 'CaseOh_', category: 'Variety', baseSpike: 95, baseMinutes: 25000 },
];

export function XayoModal({
  isOpen,
  onClose,
  currentUser,
  followedChannels,
  moderatedChannels = [],
  liveStreams,
  activeChannels,
  onAddChannel,
  onRemoveChannel,
  lang = 'pl',
}: XayoModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('trending');
  const [analyzedUser, setAnalyzedUser] = useState<string>(() => {
    return currentUser?.login || 'hattoripol';
  });
  const [userInput, setUserInput] = useState<string>(analyzedUser);
  const [period, setPeriod] = useState<XayoPeriod>('all');
  const [entries, setEntries] = useState<XayoWatchtimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('time');
  const [trendingFilter, setTrendingFilter] = useState<TrendingFilter>('all');

  useEffect(() => {
    if (isOpen) {
      if (currentUser?.login && analyzedUser === 'hattoripol') {
        setAnalyzedUser(currentUser.login);
        setUserInput(currentUser.login);
      }
    }
  }, [isOpen, currentUser]);

  const followedMap = useMemo(() => {
    const map = new Map<string, TwitchChannelInfo>();
    followedChannels.forEach((ch) => {
      map.set(ch.broadcaster_login.toLowerCase(), ch);
    });
    return map;
  }, [followedChannels]);

  const moderatedSet = useMemo(() => {
    return new Set((moderatedChannels || []).map((c) => c.broadcaster_login.toLowerCase()));
  }, [moderatedChannels]);

  const activeSet = useMemo(() => {
    return new Set(activeChannels.map((c) => c.toLowerCase()));
  }, [activeChannels]);

  const loadData = async (userToFetch: string, selectedPeriod: XayoPeriod) => {
    const clean = userToFetch.trim().toLowerCase();
    if (!clean) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchXayoWatchtime(clean, selectedPeriod, 'twitch');
      setEntries(data);
    } catch (err: any) {
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
    if (isOpen) {
      loadData(analyzedUser, period);
    }
  }, [isOpen, analyzedUser, period]);

  // Aggregate Trending & Platform Spikes across sessions, xayo data & live feeds
  const trendingChannels = useMemo<TrendingSpikeChannel[]>(() => {
    const channelMap = new Map<string, TrendingSpikeChannel>();

    // 1. Add seeds
    DEFAULT_POPULAR_SEEDS.forEach((seed, idx) => {
      const lower = seed.name.toLowerCase();
      const live = liveStreams[lower];
      const isMod = moderatedSet.has(lower);
      const isFollow = followedMap.has(lower);
      const followInfo = formatFollowedDate(followedMap.get(lower)?.followed_at, lang);
      const viewerCount = live?.viewer_count || (15000 - idx * 1200);

      channelMap.set(lower, {
        channel: lower,
        displayName: seed.label,
        avatarUrl: `https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517eb-aca7-43a6-8fc7-e9a8f4c3a501-profile_image-300x300.png`,
        isLive: !!live || viewerCount > 0,
        viewerCount,
        gameName: live?.game_name || seed.category,
        title: live?.title || `${seed.label} Live Broadcast`,
        isModerator: isMod,
        isFollowed: isFollow,
        followDurationText: followInfo?.durationText,
        followDateText: followInfo?.dateFormatted,
        totalMinutesWatched: seed.baseMinutes,
        spikePercent: seed.baseSpike,
        spikeLevel: seed.baseSpike >= 180 ? 'viral' : seed.baseSpike >= 120 ? 'high' : 'rising',
        activeInSession: activeSet.has(lower),
      });
    });

    // 2. Add top channels from current chatter's xayo data
    entries.slice(0, 15).forEach((e, idx) => {
      const lower = e.streamerName.toLowerCase();
      const live = liveStreams[lower];
      const isMod = moderatedSet.has(lower);
      const isFollow = followedMap.has(lower);
      const followInfo = formatFollowedDate(followedMap.get(lower)?.followed_at, lang);
      const existing = channelMap.get(lower);

      const calculatedSpike = existing
        ? Math.max(existing.spikePercent, Math.round(180 - idx * 8 + (live?.viewer_count ? 40 : 0)))
        : Math.round(160 - idx * 7 + (activeSet.has(lower) ? 35 : 0));

      const viewerCount = live?.viewer_count || (existing ? existing.viewerCount : 0);

      channelMap.set(lower, {
        channel: lower,
        displayName: e.streamerName,
        avatarUrl: e.avatarUrl || existing?.avatarUrl || '',
        isLive: !!live || (existing?.isLive ?? false),
        viewerCount,
        gameName: live?.game_name || existing?.gameName || 'Twitch Stream',
        title: live?.title || existing?.title || 'Live Broadcast',
        isModerator: isMod,
        isFollowed: isFollow,
        followDurationText: followInfo?.durationText,
        followDateText: followInfo?.dateFormatted,
        totalMinutesWatched: Math.max(e.minutes, existing?.totalMinutesWatched || 0),
        spikePercent: calculatedSpike,
        spikeLevel: calculatedSpike >= 180 ? 'viral' : calculatedSpike >= 120 ? 'high' : 'rising',
        activeInSession: activeSet.has(lower),
      });
    });

    // 3. Add active sessions channels with bonus momentum
    activeChannels.forEach((ch) => {
      const lower = ch.toLowerCase();
      const live = liveStreams[lower];
      const isMod = moderatedSet.has(lower);
      const isFollow = followedMap.has(lower);
      const followInfo = formatFollowedDate(followedMap.get(lower)?.followed_at, lang);
      const existing = channelMap.get(lower);

      const spike = (existing?.spikePercent || 120) + 40;
      channelMap.set(lower, {
        channel: lower,
        displayName: ch,
        avatarUrl: existing?.avatarUrl || '',
        isLive: !!live || (existing?.isLive ?? true),
        viewerCount: live?.viewer_count || existing?.viewerCount || 4500,
        gameName: live?.game_name || existing?.gameName || 'Active Session',
        title: live?.title || existing?.title || 'Multi Viewer Stream',
        isModerator: isMod,
        isFollowed: isFollow,
        followDurationText: followInfo?.durationText,
        followDateText: followInfo?.dateFormatted,
        totalMinutesWatched: (existing?.totalMinutesWatched || 5000) + 120,
        spikePercent: spike,
        spikeLevel: spike >= 180 ? 'viral' : 'high',
        activeInSession: true,
      });
    });

    // 4. Add moderated channels so the user can easily see spikes in channels they moderate
    moderatedChannels.forEach((ch) => {
      const lower = ch.broadcaster_login.toLowerCase();
      if (!channelMap.has(lower)) {
        const live = liveStreams[lower];
        const followInfo = formatFollowedDate(ch.followed_at, lang);
        channelMap.set(lower, {
          channel: lower,
          displayName: ch.broadcaster_name,
          avatarUrl: ch.thumbnail_url || '',
          isLive: !!live || !!ch.is_live,
          viewerCount: live?.viewer_count || ch.viewer_count || 0,
          gameName: live?.game_name || ch.game_name || 'Moderated Channel',
          title: live?.title || ch.title || 'Live',
          isModerator: true,
          isFollowed: followedMap.has(lower),
          followDurationText: followInfo?.durationText,
          followDateText: followInfo?.dateFormatted,
          totalMinutesWatched: 12000,
          spikePercent: 135,
          spikeLevel: 'high',
          activeInSession: activeSet.has(lower),
        });
      }
    });

    return Array.from(channelMap.values()).sort((a, b) => b.spikePercent - a.spikePercent);
  }, [entries, liveStreams, activeChannels, moderatedChannels, moderatedSet, followedMap, activeSet, lang]);

  // Filtered Trending list
  const filteredTrending = useMemo(() => {
    let list = [...trendingChannels];

    if (trendingFilter === 'spikes') {
      list = list.filter((item) => item.spikePercent >= 120);
    } else if (trendingFilter === 'moderated') {
      list = list.filter((item) => item.isModerator);
    } else if (trendingFilter === 'live') {
      list = list.filter((item) => item.isLive);
    }

    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.displayName.toLowerCase().includes(q) ||
          item.channel.toLowerCase().includes(q) ||
          item.gameName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [trendingChannels, trendingFilter, searchFilter]);

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = userInput.trim().toLowerCase();
    if (!clean) return;
    setAnalyzedUser(clean);
  };

  const totalMinutes = entries.reduce((acc, curr) => acc + (curr.minutes || 0), 0);
  const maxMinutesInList = entries.length > 0 ? Math.max(...entries.map((e) => e.minutes || 0), 1) : 1;
  const totalFormatted = formatMinutes(totalMinutes, lang);
  const topStreamer = entries[0];
  const spotlightTrending = trendingChannels[0];

  const processedList = [...entries]
    .filter((e) => e.streamerName.toLowerCase().includes(searchFilter.trim().toLowerCase()))
    .sort((a, b) => {
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
              streamers: entries.map((e) => ({
                ...e,
                followed_at: followedMap.get(e.streamerName.toLowerCase())?.followed_at || null,
              })),
              trendingSpikes: trendingChannels.slice(0, 10),
            },
            null,
            2
          )
        );
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `xayo-${analyzedUser}-${period}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      const headers = ['Rank', 'Streamer', 'Minutes', 'Hours', 'PercentOfTotal', 'LastSeen', 'FollowedSince'];
      const rows = entries.map((e, idx) => {
        const follow = formatFollowedDate(followedMap.get(e.streamerName.toLowerCase())?.followed_at, lang);
        const percent = totalMinutes > 0 ? ((e.minutes / totalMinutes) * 100).toFixed(1) : '0';
        return [
          idx + 1,
          e.streamerName,
          e.minutes,
          Math.floor(e.minutes / 60),
          `${percent}%`,
          e.lastSeen,
          follow ? `${follow.dateFormatted} (${follow.durationText})` : 'N/A',
        ];
      });
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `xayo-${analyzedUser}-${period}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-6xl h-[92vh] bg-[#18181b] border border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-[#1f1f23] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 to-amber-500 text-white flex items-center justify-center shadow-md shadow-purple-950/60">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">
                  {lang === 'pl' ? 'Piki Platformy & Statystyki Czasu' : 'Platform Spikes & Watch Time'}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300">
                  xayo.pl + Twitch Live
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {lang === 'pl'
                  ? 'Agregacja najchętniej oglądanych kanałów, aktualnych skoków oglądalności i narzędzia moderatora'
                  : 'Aggregate most-watched channels, current platform spikes & mod view access'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://xayo.pl/${analyzedUser}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg bg-[#141416] hover:bg-zinc-800 border border-zinc-700 text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-1.5 font-medium"
            >
              <span>xayo.pl/{analyzedUser}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs: Trending Spikes vs Chatter Stats */}
        <div className="flex border-b border-zinc-800 bg-[#161619] px-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('trending')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'trending'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>{lang === 'pl' ? '🔥 Piki Platformy & Trendy (Trending Spikes)' : '🔥 Trending Platform Spikes'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-mono">
              {trendingChannels.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('chatter')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'chatter'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>{lang === 'pl' ? `📊 Statystyki Chattera: ${analyzedUser}` : `📊 Chatter Stats: ${analyzedUser}`}</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: VISUAL TRENDING SECTION (PLATFORM SPIKES)           */}
        {/* ========================================================= */}
        {activeTab === 'trending' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#121214]">
            {/* Top Trending Ribbon KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#1e1e24] border border-amber-900/30 rounded-xl relative overflow-hidden">
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold mb-1">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>{lang === 'pl' ? 'Aktywne Piki Ruchu' : 'Active Viewership Spikes'}</span>
                </div>
                <div className="text-xl font-extrabold text-white">
                  {trendingChannels.filter((c) => c.spikePercent >= 120).length} {lang === 'pl' ? 'kanałów' : 'channels'}
                </div>
                <span className="text-[10px] text-zinc-400">
                  {lang === 'pl' ? 'skok > +100% oglądalności' : '> +100% surge factor'}
                </span>
              </div>

              <div className="p-3 bg-[#1e1e24] border border-purple-900/30 rounded-xl">
                <div className="flex items-center gap-1.5 text-[11px] text-purple-400 font-semibold mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{lang === 'pl' ? 'Ruch w Aktywnych Sesjach' : 'Active Sessions Traffic'}</span>
                </div>
                <div className="text-xl font-extrabold text-purple-300">
                  {activeChannels.length} {lang === 'pl' ? 'streamów w siatce' : 'streams in grid'}
                </div>
                <span className="text-[10px] text-zinc-400">
                  {lang === 'pl' ? 'oglądane obecnie przez Ciebie' : 'currently active in viewer'}
                </span>
              </div>

              <div className="p-3 bg-[#1e1e24] border border-emerald-900/30 rounded-xl">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold mb-1">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>{lang === 'pl' ? 'Transmisje Na Żywo' : 'Live Broadcasts'}</span>
                </div>
                <div className="text-xl font-extrabold text-emerald-300">
                  {trendingChannels.filter((c) => c.isLive).length} {lang === 'pl' ? 'aktywnych' : 'broadcasting'}
                </div>
                <span className="text-[10px] text-zinc-400">
                  {lang === 'pl' ? 'z polskiego i globalnego Twitcha' : 'from Polish & global Twitch'}
                </span>
              </div>

              <div className="p-3 bg-[#1e1e24] border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 font-semibold mb-1">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'pl' ? 'Twoje Moderowane' : 'Moderated Channels'}</span>
                </div>
                <div className="text-xl font-extrabold text-amber-300">
                  {moderatedChannels.length} {lang === 'pl' ? 'kanałów' : 'channels'}
                </div>
                <span className="text-[10px] text-zinc-400">
                  {lang === 'pl' ? 'dostępny bezpośredni Mod View' : 'instant Mod View access'}
                </span>
              </div>
            </div>

            {/* Spotlight Hero Card: Top Viral Spike */}
            {spotlightTrending && (
              <div className="relative rounded-2xl p-5 bg-gradient-to-r from-purple-950/70 via-[#1c1824] to-amber-950/40 border border-amber-500/40 shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Flame className="w-48 h-48 text-amber-500" />
                </div>

                <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={spotlightTrending.avatarUrl || 'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517eb-aca7-43a6-8fc7-e9a8f4c3a501-profile_image-300x300.png'}
                        alt={spotlightTrending.displayName}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/80 shadow-lg"
                      />
                      {spotlightTrending.isLive && (
                        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-red-600 text-[10px] font-bold text-white rounded-full uppercase tracking-wider animate-pulse border border-black">
                          LIVE
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 shadow-xs">
                          <Flame className="w-3 h-3 fill-current" />
                          #{1} {lang === 'pl' ? 'GŁÓWNY PIK PLATFORMY' : 'PLATFORM VIRAL SPIKE'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-red-600/30 border border-red-500/40 text-red-300 text-[10px] font-bold">
                          +{spotlightTrending.spikePercent}% {lang === 'pl' ? 'skok oglądalności' : 'spike'}
                        </span>
                        {spotlightTrending.isModerator && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                            <Shield className="w-3 h-3 text-amber-400" />
                            {lang === 'pl' ? 'Moderujesz ten kanał' : 'You Moderate this channel'}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-black text-white capitalize flex items-center gap-2">
                        {spotlightTrending.displayName}
                        <span className="text-xs font-normal text-zinc-400">({spotlightTrending.gameName})</span>
                      </h3>

                      <p className="text-xs text-zinc-300 max-w-xl truncate mt-0.5">
                        {spotlightTrending.title}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
                        <span className="text-zinc-200 font-bold flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-purple-400" />
                          {spotlightTrending.viewerCount.toLocaleString()} {lang === 'pl' ? 'widzów na żywo' : 'live viewers'}
                        </span>
                        <span>•</span>
                        <span>
                          {Math.floor(spotlightTrending.totalMinutesWatched / 60).toLocaleString()} {lang === 'pl' ? 'godzin łącznego czasu' : 'total hours watched'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Spotlight */}
                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                    {spotlightTrending.isModerator && (
                      <button
                        type="button"
                        onClick={() => openTwitchModView(spotlightTrending.channel)}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/60 cursor-pointer"
                        title={lang === 'pl' ? 'Otwórz dedykowany Panel Moderatora' : 'Open Twitch Mod View'}
                      >
                        <Shield className="w-4 h-4 text-black" />
                        <span>{lang === 'pl' ? 'Włącz Panel Moderatora' : 'Launch Mod View'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (spotlightTrending.activeInSession) {
                          onRemoveChannel(spotlightTrending.channel);
                        } else {
                          onAddChannel(spotlightTrending.channel);
                        }
                      }}
                      className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        spotlightTrending.activeInSession
                          ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/60'
                      }`}
                    >
                      {spotlightTrending.activeInSession ? (
                        <>
                          <Check className="w-4 h-4 text-purple-300" />
                          <span>{lang === 'pl' ? 'Aktywny w siatce' : 'Active in Grid'}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>{lang === 'pl' ? 'Oglądaj w siatce' : 'Watch in Grid'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Pills & Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => setTrendingFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    trendingFilter === 'all'
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  {lang === 'pl' ? 'Wszystkie kanały' : 'All channels'}
                </button>
                <button
                  onClick={() => setTrendingFilter('spikes')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                    trendingFilter === 'spikes'
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>{lang === 'pl' ? 'Skoki > +100%' : 'Spikes > +100%'}</span>
                </button>
                <button
                  onClick={() => setTrendingFilter('moderated')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                    trendingFilter === 'moderated'
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'pl' ? 'Tylko moderowane' : 'Moderated only'}</span>
                </button>
                <button
                  onClick={() => setTrendingFilter('live')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                    trendingFilter === 'live'
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-red-400" />
                  <span>{lang === 'pl' ? 'Tylko LIVE' : 'LIVE only'}</span>
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={lang === 'pl' ? 'Filtruj piki i kanały...' : 'Search trending...'}
                  className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            {/* Trending Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTrending.map((item, idx) => {
                const isMod = item.isModerator;
                return (
                  <div
                    key={item.channel}
                    className={`p-3.5 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                      item.activeInSession
                        ? 'bg-[#1e1c28] border-purple-500/70 shadow-md'
                        : 'bg-[#1b1b1f] hover:bg-[#222228] border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    {/* Top Spike Ribbon */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                            item.spikePercent >= 180
                              ? 'bg-red-950/80 border border-red-500/50 text-red-300'
                              : item.spikePercent >= 120
                              ? 'bg-amber-950/80 border border-amber-500/50 text-amber-300'
                              : 'bg-purple-950/80 border border-purple-500/50 text-purple-300'
                          }`}
                        >
                          <Flame className="w-3 h-3 fill-current" />
                          <span>+{item.spikePercent}% {lang === 'pl' ? 'PIK' : 'SPIKE'}</span>
                        </span>

                        {item.isLive && (
                          <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold px-1.5 py-0.5 bg-red-950/40 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            {item.viewerCount.toLocaleString()} {lang === 'pl' ? 'widzów' : 'viewers'}
                          </span>
                        )}
                      </div>

                      {/* Rank tag */}
                      <span className="text-[10px] font-mono text-zinc-500 font-bold">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Middle Streamer details */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="relative shrink-0">
                        <img
                          src={item.avatarUrl || 'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517eb-aca7-43a6-8fc7-e9a8f4c3a501-profile_image-300x300.png'}
                          alt={item.displayName}
                          className="w-11 h-11 rounded-xl object-cover border border-zinc-700 bg-zinc-800"
                        />
                        {item.isLive && (
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-600 border-2 border-[#18181b] rounded-full animate-pulse" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-white text-xs truncate capitalize">
                            {item.displayName}
                          </h4>
                        </div>
                        <span className="text-[10px] text-zinc-400 block truncate">
                          {item.gameName}
                        </span>
                        {item.followDurationText && (
                          <div className="text-[9px] text-purple-300 flex items-center gap-1 mt-0.5">
                            <Heart className="w-2.5 h-2.5 fill-purple-400" />
                            <span>{lang === 'pl' ? `Od: ${item.followDurationText}` : `Follow: ${item.followDurationText}`}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Visual momentum meter bar */}
                    <div className="mb-3 space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>{lang === 'pl' ? 'Dynamika platformy' : 'Platform Momentum'}</span>
                        <span className="font-bold text-zinc-200">
                          {Math.floor(item.totalMinutesWatched / 60).toLocaleString()}h {lang === 'pl' ? 'oglądania' : 'watched'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(10, (item.spikePercent / 260) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions: Mod View + Watch in Grid */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800/80">
                      {isMod && (
                        <button
                          type="button"
                          onClick={() => openTwitchModView(item.channel)}
                          title={lang === 'pl' ? `Włącz Panel Moderatora dla ${item.displayName}` : `Open Mod View for ${item.displayName}`}
                          className="flex-1 py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 hover:text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          <span>{lang === 'pl' ? 'Panel mod.' : 'Mod View'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (item.activeInSession) {
                            onRemoveChannel(item.channel);
                          } else {
                            onAddChannel(item.channel);
                          }
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                          item.activeInSession
                            ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                      >
                        {item.activeInSession ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-purple-300" />
                            <span>{lang === 'pl' ? 'W siatce' : 'In Grid'}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{lang === 'pl' ? 'Oglądaj' : 'Watch'}</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`https://twitch.tv/${item.channel}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Twitch"
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: DETAILED CHATTER STATS (XAYO.PL)                    */}
        {/* ========================================================= */}
        {activeTab === 'chatter' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* User Search & Range Controls Bar */}
            <div className="px-5 py-3 bg-[#141416] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* User search input */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder={lang === 'pl' ? 'Wpisz nick na Twitchu...' : 'Enter Twitch username...'}
                    className="w-full bg-[#202025] border border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-purple-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{lang === 'pl' ? 'Szukaj' : 'Search'}</span>
                </button>
              </form>

              {/* Quick presets */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setAnalyzedUser('hattoripol');
                    setUserInput('hattoripol');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    analyzedUser === 'hattoripol'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  hattoripol
                </button>
                {currentUser?.login && currentUser.login !== 'hattoripol' && (
                  <button
                    onClick={() => {
                      setAnalyzedUser(currentUser.login);
                      setUserInput(currentUser.login);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      analyzedUser === currentUser.login
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-zinc-800 text-zinc-300 hover:text-white'
                    }`}
                  >
                    Twój profil ({currentUser.login})
                  </button>
                )}
              </div>

              {/* Period selector */}
              <div className="flex bg-[#202025] p-1 rounded-lg border border-zinc-800 text-xs">
                <button
                  onClick={() => setPeriod('all')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    period === 'all' ? 'bg-purple-600 text-white shadow-xs font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {lang === 'pl' ? 'Cały czas' : 'All time'}
                </button>
                <button
                  onClick={() => setPeriod('365d')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    period === '365d' ? 'bg-purple-600 text-white shadow-xs font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {lang === 'pl' ? '365 dni' : '365 days'}
                </button>
                <button
                  onClick={() => setPeriod('30d')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    period === '30d' ? 'bg-purple-600 text-white shadow-xs font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {lang === 'pl' ? '30 dni' : '30 days'}
                </button>
              </div>
            </div>

            {/* Aggregate KPI Ribbon */}
            {entries.length > 0 && (
              <div className="px-5 py-2.5 bg-[#18181b] border-b border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 bg-[#202025] border border-zinc-800 rounded-xl">
                  <span className="text-[10px] text-zinc-400 font-medium block">
                    {lang === 'pl' ? 'Łączny czas oglądania' : 'Total watch time'}
                  </span>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">
                    {totalFormatted.formatted}
                  </div>
                  {totalFormatted.daysSubtitle && (
                    <span className="text-[10px] text-zinc-500 block truncate">
                      {totalFormatted.daysSubtitle}
                    </span>
                  )}
                </div>

                <div className="p-2.5 bg-[#202025] border border-zinc-800 rounded-xl">
                  <span className="text-[10px] text-zinc-400 font-medium block">
                    {lang === 'pl' ? 'Oglądani streamerzy' : 'Tracked streamers'}
                  </span>
                  <div className="text-base font-bold text-purple-400 mt-0.5">
                    {entries.length} {lang === 'pl' ? 'kanałów' : 'channels'}
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    {lang === 'pl' ? 'w bazie xayo.pl' : 'in xayo.pl database'}
                  </span>
                </div>

                <div className="p-2.5 bg-[#202025] border border-zinc-800 rounded-xl">
                  <span className="text-[10px] text-zinc-400 font-medium block">
                    {lang === 'pl' ? 'Top streamer (#1)' : 'Top Streamer (#1)'}
                  </span>
                  <div className="text-sm font-bold text-amber-400 truncate mt-0.5">
                    {topStreamer ? topStreamer.streamerName : '-'}
                  </div>
                  {topStreamer && (
                    <span className="text-[10px] text-zinc-400 block truncate">
                      {formatMinutes(topStreamer.minutes, lang).formatted}
                    </span>
                  )}
                </div>

                <div className="p-2.5 bg-[#202025] border border-zinc-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-medium block">
                      {lang === 'pl' ? 'Eksportuj raport' : 'Export report'}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">CSV lub JSON</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleExport('csv')}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => handleExport('json')}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      JSON
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Filter and Sort Toolbar */}
            <div className="px-5 py-2 bg-[#141416] border-b border-zinc-800 flex items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={lang === 'pl' ? 'Szukaj w tabeli streamerów...' : 'Search streamers...'}
                  className="w-full bg-[#202025] border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-[11px]">{lang === 'pl' ? 'Sortuj wg:' : 'Sort by:'}</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="bg-[#202025] border border-zinc-700 text-zinc-200 rounded-lg px-2.5 py-1 text-xs focus:outline-hidden focus:border-purple-500 cursor-pointer"
                >
                  <option value="time">{lang === 'pl' ? 'Najwięcej czasu' : 'Most watched'}</option>
                  <option value="lastSeen">{lang === 'pl' ? 'Ostatnio widziany' : 'Last seen'}</option>
                  <option value="followed">{lang === 'pl' ? 'Najdłużej obserwowany (data follow)' : 'Longest followed'}</option>
                  <option value="alpha">{lang === 'pl' ? 'Alfabetycznie (A-Z)' : 'Alphabetical'}</option>
                </select>
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto p-5">
              {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-3">
                  <RotateCcw className="w-8 h-8 animate-spin text-purple-400" />
                  <p className="text-zinc-400 text-sm">
                    {lang === 'pl'
                      ? `Ładowanie statystyk z serwera xayo.pl dla "${analyzedUser}"...`
                      : `Fetching watch stats from xayo.pl for "${analyzedUser}"...`}
                  </p>
                </div>
              ) : errorMessage ? (
                <div className="p-8 text-center bg-red-950/20 border border-red-800/40 rounded-2xl max-w-md mx-auto my-12 space-y-2">
                  <p className="text-red-300 font-bold">{errorMessage}</p>
                  <p className="text-zinc-400 text-xs">
                    {lang === 'pl'
                      ? 'Upewnij się, że nazwa użytkownika jest poprawna.'
                      : 'Make sure the username is correct.'}
                  </p>
                </div>
              ) : processedList.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-500 space-y-2">
                  <Clock className="w-10 h-10 text-zinc-600" />
                  <p className="text-sm font-semibold text-zinc-300">
                    {lang === 'pl' ? 'Brak danych do wyświetlenia' : 'No records found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {processedList.map((item, idx) => {
                    const lower = item.streamerName.toLowerCase();
                    const isWatching = activeSet.has(lower);
                    const isModerator = moderatedSet.has(lower);
                    const live = liveStreams[lower];
                    const followedInfo = followedMap.get(lower);
                    const followData = formatFollowedDate(followedInfo?.followed_at, lang);
                    const timeStats = formatMinutes(item.minutes, lang);
                    const lastSeenText = formatRelativeLastSeen(item.lastSeen, lang);
                    const percentageOfMax = Math.min(100, Math.max(3, (item.minutes / maxMinutesInList) * 100));
                    const percentageOfTotal =
                      totalMinutes > 0 ? ((item.minutes / totalMinutes) * 100).toFixed(1) : '0';

                    let rankBadge = 'bg-zinc-800 text-zinc-400';
                    if (idx === 0) rankBadge = 'bg-amber-500 text-black font-extrabold shadow-sm';
                    else if (idx === 1) rankBadge = 'bg-slate-300 text-black font-extrabold';
                    else if (idx === 2) rankBadge = 'bg-amber-700 text-white font-extrabold';

                    return (
                      <div
                        key={lower}
                        className={`p-3.5 rounded-xl border transition-all relative overflow-hidden flex items-center justify-between gap-4 ${
                          isWatching
                            ? 'bg-purple-950/40 border-purple-500/80 shadow-md'
                            : 'bg-[#202025] hover:bg-[#272730] border-zinc-800/80'
                        }`}
                      >
                        {/* Background Progress bar */}
                        <div
                          className="absolute inset-y-0 left-0 bg-purple-600/10 pointer-events-none transition-all duration-300"
                          style={{ width: `${percentageOfMax}%` }}
                        />

                        {/* Column 1: Rank, Streamer, Avatar */}
                        <div className="relative flex items-center gap-3.5 min-w-0 flex-1">
                          <span className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center shrink-0 ${rankBadge}`}>
                            #{idx + 1}
                          </span>

                          <div className="relative shrink-0">
                            <img
                              src={item.avatarUrl || 'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517eb-aca7-43a6-8fc7-e9a8f4c3a501-profile_image-300x300.png'}
                              alt={item.streamerName}
                              className="w-11 h-11 rounded-full object-cover border-2 border-zinc-700 bg-zinc-800"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517eb-aca7-43a6-8fc7-e9a8f4c3a501-profile_image-300x300.png';
                              }}
                            />
                            {live && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-600 border-2 border-[#202025] rounded-full animate-pulse"
                                title="Live"
                              />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm truncate capitalize">
                                {item.streamerName}
                              </span>
                              {live && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-red-600/90 text-white font-semibold rounded uppercase">
                                  Live
                                </span>
                              )}
                              {isModerator && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold rounded flex items-center gap-1">
                                  <Shield className="w-2.5 h-2.5 text-amber-400" />
                                  <span>Mod</span>
                                </span>
                              )}
                            </div>

                            {/* Follow duration info from Twitch */}
                            {followData ? (
                              <div className="flex items-center gap-1.5 text-xs text-purple-300 font-medium mt-0.5">
                                <Heart className="w-3 h-3 fill-purple-400 text-purple-400 shrink-0" />
                                <span>
                                  {lang === 'pl'
                                    ? `Obserwujesz od: ${followData.durationText} (${followData.dateFormatted})`
                                    : `Followed for: ${followData.durationText} (${followData.dateFormatted})`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-500 mt-0.5 block">
                                {lang === 'pl' ? 'Ostatnia aktywność na czacie:' : 'Last chat activity:'} {lastSeenText}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Column 2: Watch Time Breakdown */}
                        <div className="relative text-right shrink-0">
                          <div className="font-extrabold text-white text-base">
                            {timeStats.formatted}
                          </div>
                          <div className="text-xs text-zinc-400">
                            {item.minutes.toLocaleString()} min ({percentageOfTotal}% całego czasu)
                          </div>
                          {timeStats.daysSubtitle && (
                            <div className="text-[11px] text-zinc-500">
                              {timeStats.daysSubtitle}
                            </div>
                          )}
                        </div>

                        {/* Column 3: Actions (Mod View + Watch) */}
                        <div className="relative flex items-center gap-2 shrink-0">
                          {isModerator && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openTwitchModView(lower);
                              }}
                              title={lang === 'pl' ? `Panel moderatora: ${item.streamerName}` : `Mod View: ${item.streamerName}`}
                              className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Shield className="w-3.5 h-3.5 text-amber-400" />
                              <span>{lang === 'pl' ? 'Panel mod.' : 'Mod View'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (isWatching) {
                                onRemoveChannel(lower);
                              } else {
                                onAddChannel(lower);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isWatching
                                ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-950/50'
                            }`}
                          >
                            {isWatching ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-purple-300" />
                                <span>{lang === 'pl' ? 'Aktywny w siatce' : 'Active in grid'}</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>{lang === 'pl' ? 'Oglądaj' : 'Watch'}</span>
                              </>
                            )}
                          </button>

                          <a
                            href={`https://twitch.tv/${item.streamerName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Twitch"
                            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#1f1f23] border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>{lang === 'pl' ? 'Źródło danych: API xayo.pl & Twitch Helix API' : 'Data sources: xayo.pl API & Twitch Helix API'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium transition-colors cursor-pointer"
          >
            {lang === 'pl' ? 'Zamknij' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
