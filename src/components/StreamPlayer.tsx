import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  MessageSquare,
  RotateCcw,
  ExternalLink,
  Clock,
  Radio,
  Volume2,
  Shield,
} from 'lucide-react';
import { ChannelWatchStat } from '../types';
import { formatTime } from '../hooks/useWatchTimeTracker';
import { openTwitchModView } from '../services/twitchApi';

interface StreamPlayerProps {
  channel: string;
  isLive?: boolean;
  isModerator?: boolean;
  gameName?: string;
  streamTitle?: string;
  viewerCount?: number;
  watchStat?: ChannelWatchStat;
  isTheater?: boolean;
  onToggleTheater?: (channel: string) => void;
  onClose: (channel: string) => void;
  lang?: 'pl' | 'en';
}

export function StreamPlayer({
  channel,
  isLive,
  isModerator,
  gameName,
  streamTitle,
  viewerCount,
  watchStat,
  isTheater,
  onToggleTheater,
  onClose,
  lang = 'pl',
}: StreamPlayerProps) {
  const [showChat, setShowChat] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [playerLoaded, setPlayerLoaded] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  const containerId = `twitch-player-${channel.toLowerCase()}-${reloadKey}`;

  // Build parent domain list
  const getParentDomains = (): string[] => {
    const list: string[] = [];
    if (typeof window !== 'undefined') {
      if (window.location.hostname) list.push(window.location.hostname);
      try {
        if (window.parent && window.parent.location.hostname) {
          list.push(window.parent.location.hostname);
        }
      } catch {
        // ignore cross-origin security block
      }
      if (document.referrer) {
        try {
          const refHost = new URL(document.referrer).hostname;
          if (refHost) list.push(refHost);
        } catch {}
      }
    }
    list.push('localhost', '127.0.0.1');
    return Array.from(new Set(list.filter(Boolean)));
  };

  const parents = getParentDomains();
  const parentQuery = parents.map((p) => `parent=${encodeURIComponent(p)}`).join('&');

  useEffect(() => {
    let isCancelled = false;
    setPlayerLoaded(false);

    // Initialize Twitch Interactive Player if script is ready
    const initPlayer = () => {
      if (isCancelled || !containerRef.current) return;

      const TwitchWindow = (window as any).Twitch;
      if (TwitchWindow && TwitchWindow.Player) {
        // Clear previous player dom
        containerRef.current.innerHTML = '';

        try {
          const player = new TwitchWindow.Player(containerRef.current, {
            channel: channel.toLowerCase(),
            width: '100%',
            height: '100%',
            parent: parents,
            autoplay: true,
            muted: true, // browsers require mute for autoplay
          });
          playerInstanceRef.current = player;
          setPlayerLoaded(true);
        } catch (err) {
          console.warn('Twitch.Player SDK init fallback to iframe', err);
        }
      }
    };

    // Retry a bit if script is still loading
    if ((window as any).Twitch?.Player) {
      initPlayer();
    } else {
      const timer = setTimeout(initPlayer, 600);
      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }

    return () => {
      isCancelled = true;
    };
  }, [channel, reloadKey]);

  const handleRefresh = () => {
    setReloadKey((prev) => prev + 1);
  };

  const totalTimeStr = watchStat ? formatTime(watchStat.totalSeconds) : '0s';
  const sessionTimeStr = watchStat ? formatTime(watchStat.sessionSeconds) : '0s';

  const chatEmbedUrl = `https://www.twitch.tv/embed/${encodeURIComponent(
    channel.toLowerCase()
  )}/chat?${parentQuery}&darkpopout=true`;

  return (
    <div
      className={`group relative flex flex-col bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden shadow-xl transition-all duration-200 ${
        isTheater ? 'fixed inset-2 z-50 rounded-2xl shadow-2xl border-purple-500/50' : 'h-full min-h-[340px]'
      }`}
    >
      {/* Stream Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1f1f23] border-b border-[#2d2d34] select-none text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <a
              href={`https://twitch.tv/${channel}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-sm text-white hover:text-purple-400 transition-colors truncate flex items-center gap-1"
              title={`${lang === 'pl' ? 'Otwórz na Twitchu' : 'Open on Twitch'}: ${channel}`}
            >
              {channel}
              <ExternalLink className="w-3 h-3 text-zinc-500 hover:text-zinc-300" />
            </a>
          </div>

          {isLive && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-600/90 text-white uppercase tracking-wider">
              <Radio className="w-2.5 h-2.5 animate-ping" />
              LIVE
            </span>
          )}

          {viewerCount !== undefined && viewerCount > 0 && (
            <span className="text-[11px] text-zinc-400 hidden sm:inline-block">
              {viewerCount.toLocaleString()} {lang === 'pl' ? 'widzów' : 'viewers'}
            </span>
          )}

          {gameName && (
            <span className="hidden md:inline-block text-[11px] text-zinc-400 truncate max-w-[120px] bg-[#27272a] px-1.5 py-0.5 rounded">
              {gameName}
            </span>
          )}

          {isModerator && (
            <button
              onClick={() => openTwitchModView(channel)}
              title={lang === 'pl' ? `Panel moderatora: ${channel}` : `Mod View: ${channel}`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/25 hover:bg-amber-500/40 border border-amber-500/50 text-amber-300 hover:text-white transition-colors text-[10px] font-bold cursor-pointer"
            >
              <Shield className="w-3 h-3 text-amber-400" />
              <span>Mod View</span>
            </button>
          )}
        </div>

        {/* Action Controls & Watch Time */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Watch Time Badge */}
          <div
            className="flex items-center gap-1 bg-zinc-800/90 border border-zinc-700/60 px-2 py-0.5 rounded text-[11px] text-purple-300 font-medium"
            title={`${lang === 'pl' ? 'Czas w tej sesji / Łącznie' : 'Session time / Total time'}`}
          >
            <Clock className="w-3 h-3 text-purple-400" />
            <span>{sessionTimeStr}</span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-300">{totalTimeStr}</span>
          </div>

          {/* Toggle Chat */}
          <button
            onClick={() => setShowChat(!showChat)}
            title={showChat ? (lang === 'pl' ? 'Schowaj czat' : 'Hide chat') : (lang === 'pl' ? 'Pokaż czat' : 'Show chat')}
            className={`p-1.5 rounded transition-colors ${
              showChat
                ? 'bg-purple-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          {/* Refresh Stream */}
          <button
            onClick={handleRefresh}
            title={lang === 'pl' ? 'Odśwież stream' : 'Refresh stream'}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Theater Mode */}
          {onToggleTheater && (
            <button
              onClick={() => onToggleTheater(channel)}
              title={isTheater ? (lang === 'pl' ? 'Zwiń' : 'Minimize') : (lang === 'pl' ? 'Tryb kinowy' : 'Theater mode')}
              className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              {isTheater ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Close Stream */}
          <button
            onClick={() => onClose(channel)}
            title={lang === 'pl' ? 'Zamknij stream' : 'Close stream'}
            className="p-1.5 rounded text-red-400 hover:text-white hover:bg-red-600/80 transition-colors ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Player + Chat Body */}
      <div className="flex-1 flex flex-row overflow-hidden relative bg-black">
        {/* Video Player Area */}
        <div className={`relative flex-1 h-full min-h-0 ${showChat ? 'w-2/3' : 'w-full'}`}>
          <div
            id={containerId}
            ref={containerRef}
            className="w-full h-full"
          />

          {/* Fallback iframe if SDK hasn't loaded */}
          {!playerLoaded && (
            <iframe
              src={`https://player.twitch.tv/?channel=${channel.toLowerCase()}&${parentQuery}&autoplay=true&muted=true`}
              title={`Twitch Player - ${channel}`}
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
            />
          )}

          {/* Unmute / interaction hint */}
          <div className="absolute bottom-2 left-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 backdrop-blur-xs text-[11px] text-zinc-300 px-2 py-1 rounded flex items-center gap-1.5 border border-zinc-800">
            <Volume2 className="w-3 h-3 text-purple-400" />
            <span>{lang === 'pl' ? 'Domyślnie wyciszone (zasady przeglądarek)' : 'Muted by default (browser policy)'}</span>
          </div>
        </div>

        {/* Embedded Twitch Chat */}
        {showChat && (
          <div className="w-80 border-l border-[#2d2d34] bg-[#0e0e10] flex flex-col h-full shrink-0">
            <div className="px-3 py-1.5 bg-[#18181b] border-b border-[#2d2d34] flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-zinc-200">
                {lang === 'pl' ? 'Czat na żywo' : 'Live Chat'}
              </span>
              <button
                onClick={() => setShowChat(false)}
                className="hover:text-white p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <iframe
              src={chatEmbedUrl}
              title={`Twitch Chat - ${channel}`}
              className="w-full flex-1 border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
