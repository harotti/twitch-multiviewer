import { StreamPlayer } from './StreamPlayer';
import { ChannelWatchStat, GridMode, TwitchChannelInfo } from '../types';
import { LiveStreamData } from '../services/twitchApi';
import { Tv, Sparkles, Plus, Play } from 'lucide-react';

interface StreamGridProps {
  activeChannels: string[];
  watchStats: Record<string, ChannelWatchStat>;
  channelMeta?: Record<string, TwitchChannelInfo>;
  liveStreams?: Record<string, LiveStreamData>;
  moderatedChannels?: TwitchChannelInfo[];
  theaterChannel: string | null;
  gridMode: GridMode;
  globalAutoPlay?: boolean;
  onToggleTheater: (channel: string) => void;
  onCloseStream: (channel: string) => void;
  onAddChannel: (channel: string) => void;
  onOpenModView?: (channel: string) => void;
  onStreamLiveDetected?: (channel: string) => void;
  lang?: 'pl' | 'en';
}

const POPULAR_SUGGESTIONS = [
  { name: 'eslcs', label: 'ESL CS', category: 'Counter-Strike 2' },
  { name: 'riotgames', label: 'Riot Games', category: 'League of Legends' },
  { name: 'shroud', label: 'shroud', category: 'Variety' },
  { name: 'xmerghani', label: 'xmerghani', category: 'Just Chatting' },
  { name: 'izakooo', label: 'izakooo', category: 'Counter-Strike 2' },
  { name: 'h2p_gucio', label: 'H2P_Gucio', category: 'Variety' },
  { name: 'tarik', label: 'tarik', category: 'VALORANT' },
  { name: 'caseoh_', label: 'CaseOh_', category: 'Variety' },
];

export function StreamGrid({
  activeChannels,
  watchStats,
  channelMeta = {},
  liveStreams = {},
  moderatedChannels = [],
  theaterChannel,
  gridMode,
  globalAutoPlay = true,
  onToggleTheater,
  onCloseStream,
  onAddChannel,
  onOpenModView,
  onStreamLiveDetected,
  lang = 'pl',
}: StreamGridProps) {
  if (activeChannels.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none bg-gradient-to-b from-[#18181b]/50 to-[#0e0e10]">
        <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-5 text-purple-400 shadow-lg shadow-purple-900/20">
          <Tv className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {lang === 'pl' ? 'Brak aktywnych transmisji' : 'No Active Streams'}
        </h2>
        <p className="text-zinc-400 max-w-md text-sm mb-6 leading-relaxed">
          {lang === 'pl'
            ? 'Wpisz nazwę kanału w górnym pasku, zaloguj się z Twitchem po lewej, lub wybierz jednego z polecanych streamerów poniżej.'
            : 'Enter a channel name in the top bar, log in with Twitch on the left, or select a suggested stream below.'}
        </p>

        <div className="w-full max-w-xl bg-[#18181b] border border-[#27272a] rounded-xl p-4 text-left shadow-xl">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-purple-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'pl' ? 'Szybki start - polecane kanały' : 'Quick Start - Suggested Channels'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {POPULAR_SUGGESTIONS.map((item) => (
              <button
                key={item.name}
                onClick={() => onAddChannel(item.name)}
                className="flex flex-col items-start p-2.5 rounded-lg bg-[#202025] hover:bg-[#27272e] border border-zinc-800/80 hover:border-purple-500/50 transition-all text-left group"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-semibold text-xs text-zinc-200 group-hover:text-purple-400 transition-colors truncate">
                    {item.label}
                  </span>
                  <Plus className="w-3 h-3 text-zinc-500 group-hover:text-purple-400 shrink-0" />
                </div>
                <span className="text-[10px] text-zinc-500 truncate w-full">
                  {item.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Determine grid container classes based on gridMode
  let gridClass = 'grid gap-3 h-full w-full';
  if (gridMode === '1x1') {
    gridClass += ' grid-cols-1 grid-rows-1';
  } else if (gridMode === '1x2') {
    gridClass += ' grid-cols-1 md:grid-cols-2 grid-rows-1';
  } else if (gridMode === '2x2') {
    gridClass += ' grid-cols-1 md:grid-cols-2 md:grid-rows-2';
  } else if (gridMode === '3x2') {
    gridClass += ' grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:grid-rows-2';
  } else {
    // Auto dynamic sizing
    if (activeChannels.length === 1) {
      gridClass += ' grid-cols-1';
    } else if (activeChannels.length === 2) {
      gridClass += ' grid-cols-1 lg:grid-cols-2';
    } else if (activeChannels.length === 3) {
      gridClass += ' grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    } else if (activeChannels.length === 4) {
      gridClass += ' grid-cols-1 md:grid-cols-2';
    } else {
      gridClass += ' grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
    }
  }

  const moderatedSet = new Set((moderatedChannels || []).map((c) => c.broadcaster_login.toLowerCase()));

  return (
    <div className="h-full w-full relative p-3 overflow-y-auto">
      <div className={gridClass}>
        {activeChannels.map((channel) => {
          const lower = channel.toLowerCase();
          const meta = channelMeta[lower];
          const live = liveStreams[lower];
          const stat = watchStats[lower];
          const isTheater = theaterChannel === lower;
          const isModerator = moderatedSet.has(lower);

          return (
            <StreamPlayer
              key={lower}
              channel={channel}
              isLive={!!live || meta?.is_live}
              isModerator={isModerator}
              gameName={live?.game_name || meta?.game_name}
              streamTitle={live?.title || meta?.title}
              viewerCount={live?.viewer_count}
              watchStat={stat}
              isTheater={isTheater}
              globalAutoPlay={globalAutoPlay}
              onToggleTheater={onToggleTheater}
              onClose={onCloseStream}
              onOpenModView={onOpenModView}
              onStreamLiveDetected={onStreamLiveDetected}
              lang={lang}
            />
          );
        })}
      </div>
    </div>
  );
}
