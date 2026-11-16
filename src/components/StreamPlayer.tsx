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
  globalAutoPlay?: boolean;
  onToggleTheater?: (channel: string) => void;
  onClose: (channel: string) => void;
  onOpenModView?: (channel: string) => void;
  onStreamLiveDetected?: (channel: string) => void;
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
  globalAutoPlay = true,
  onToggleTheater,
  onClose,
  onOpenModView,
  onStreamLiveDetected,
  lang = 'pl',
}: StreamPlayerProps) {
  const [showChat, setShowChat] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [playerLoaded, setPlayerLoaded] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const lastRefreshTimeRef = useRef<number>(Date.now());

  const containerId = `twitch-player-${channel.toLowerCase()}-${reloadKey}`;

  // Build parent domain list (must include AI Studio domains to prevent Twitch embed blocking)
  const getParentDomains = (): string[] => {
    const list: string[] = [];
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host) list.push(host);

      if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
        for (let i = 0; i < window.location.ancestorOrigins.length; i++) {
          try {
            const originHost = new URL(window.location.ancestorOrigins[i]).hostname;
            if (originHost) list.push(originHost);
          } catch {}
        }
      }

      try {
        if (window.parent && window.parent.location.hostname) {
          list.push(window.parent.location.hostname);
        }
      } catch {}

      if (document.referrer) {
        try {
          const refHost = new URL(document.referrer).hostname;
          if (refHost) list.push(refHost);
        } catch {}
      }

      if (host.includes('run.app') || (document.referrer && document.referrer.includes('google.com'))) {
        list.push('aistudio.google.com');
      }
    }
    return Array.from(new Set(list.filter(Boolean)));
  };

  const parents = getParentDomains();
  const parentQuery = parents.map((p) => `parent=${encodeURIComponent(p)}`).join('&');

  useEffect(() => {
    let isCancelled = false;

    // Helper to fix browser permission attributes on dynamically inserted Twitch iframes
    const fixIframePermissions = () => {
      if (!containerRef.current) return;
      const iframes = containerRef.current.querySelectorAll('iframe');
      iframes.forEach((ifr) => {
        ifr.setAttribute('allow', 'autoplay; fullscreen');
        ifr.setAttribute('allowfullscreen', 'true');
      });
    };

    // Initialize Twitch Interactive Player if script is ready
    const initPlayer = () => {
      if (isCancelled || !containerRef.current) return;

      const TwitchWindow = (window as any).Twitch;
      if (TwitchWindow && TwitchWindow.Player) {
        // Clean previous player DOM completely
        containerRef.current.innerHTML = '';

        try {
          const player = new TwitchWindow.Player(containerRef.current, {
            channel: channel.toLowerCase(),
            width: '100%',
            height: '100%',
            parent: parents,
            autoplay: true,
            muted: true, // browser autoplay policy mandates muted on initial programmatic play
          });
          playerInstanceRef.current = player;

          // Grant iframe permission to autoplay immediately
          fixIframePermissions();
          setTimeout(fixIframePermissions, 200);
          setTimeout(fixIframePermissions, 800);

          if (typeof window !== 'undefined') {
            (window as any).__twitchPlayers = (window as any).__twitchPlayers || new Map();
            (window as any).__twitchPlayers.set(channel.toLowerCase(), player);
          }
          setPlayerLoaded(true);

          // Force playback resumption (Auto-Play)
          const forceResume = () => {
            if (isCancelled) return;
            try {
              if (typeof player.setMuted === 'function') {
                player.setMuted(true);
              }
              if (typeof player.play === 'function') {
                player.play();
              }
            } catch (e) {
              console.warn('AutoPlay playback resumption failed:', e);
            }
          };

          // Event 1: Player is ready
          if (TwitchWindow.Player.READY) {
            player.addEventListener(TwitchWindow.Player.READY, () => {
              fixIframePermissions();
              forceResume();
            });
          }

          // Event 2: Stream went online / reconnected
          if (TwitchWindow.Player.ONLINE) {
            player.addEventListener(TwitchWindow.Player.ONLINE, () => {
              forceResume();
              if (onStreamLiveDetected) {
                onStreamLiveDetected(channel.toLowerCase().trim());
              }
            });
          }

          // Event 2b: Stream starts playing video
          if (TwitchWindow.Player.PLAYING) {
            player.addEventListener(TwitchWindow.Player.PLAYING, () => {
              if (onStreamLiveDetected) {
                onStreamLiveDetected(channel.toLowerCase().trim());
              }
            });
          }

          // Event 3: If stream pauses during reload or mount cycle, auto-resume immediately
          if (TwitchWindow.Player.PAUSE) {
            player.addEventListener(TwitchWindow.Player.PAUSE, () => {
              if (Date.now() - lastRefreshTimeRef.current < 7000) {
                setTimeout(forceResume, 150);
              }
            });
          }

          // Staggered timers to ensure playback resumes as soon as HLS chunk arrives
          const t1 = setTimeout(forceResume, 250);
          const t2 = setTimeout(forceResume, 700);
          const t3 = setTimeout(forceResume, 1500);
          const t4 = setTimeout(forceResume, 2800);

          cleanupTimers = () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
          };
        } catch (err) {
          console.warn('Twitch.Player SDK init fallback to iframe', err);
          setPlayerLoaded(false);
        }
      }
    };

    let cleanupTimers: (() => void) | null = null;

    // If script is ready, init directly without unmounting
    if ((window as any).Twitch?.Player) {
      initPlayer();
    } else {
      setPlayerLoaded(false);
      const timer = setTimeout(initPlayer, 500);
      return () => {
        isCancelled = true;
        if (typeof window !== 'undefined' && (window as any).__twitchPlayers) {
          (window as any).__twitchPlayers.delete(channel.toLowerCase());
        }
        clearTimeout(timer);
      };
    }

    return () => {
      isCancelled = true;
      if (cleanupTimers) cleanupTimers();
      if (typeof window !== 'undefined' && (window as any).__twitchPlayers) {
        (window as any).__twitchPlayers.delete(channel.toLowerCase());
      }
    };
  }, [channel, reloadKey, globalAutoPlay]);

  // Robust Stream Refresh handler: completely rebuilds player to reconnect live edge and auto-play
  const handleRefresh = () => {
    setIsRefreshing(true);
    lastRefreshTimeRef.current = Date.now();

    // 1. If player SDK instance is active, attempt soft resume or pause
    const player = playerInstanceRef.current;
    if (player) {
      try {
        if (typeof player.pause === 'function') {
          player.pause();
        }
      } catch {}
      playerInstanceRef.current = null;
    }

    // 2. Wipe container DOM cleanly to terminate old HLS buffer completely
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // 3. Increment reloadKey to trigger fresh player instantiation with new HLS connection
    setReloadKey((prev) => prev + 1);

    // 4. Release refreshing visual spinner after mount starts
    setTimeout(() => {
      setIsRefreshing(false);
    }, 900);
  };

  const totalTimeStr = watchStat ? formatTime(watchStat.totalSeconds) : '0s';
  const sessionTimeStr = watchStat ? formatTime(watchStat.sessionSeconds) : '0s';

  const handleOpenPopoutChat = () => {
    const url = `https://www.twitch.tv/popout/${encodeURIComponent(channel.toLowerCase())}/chat?darkpopout=true`;
    const width = 440;
    const height = 750;
    const left = typeof window !== 'undefined' && window.screen.width ? Math.max(0, window.screen.width - width - 50) : 100;
    const top = 60;
    window.open(
      url,
      `twitch_popout_${channel.toLowerCase()}`,
      `width=${width},height=${height},top=${top},left=${left},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );
  };

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
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#1f1f23] border-b border-[#2d2d34] select-none text-xs gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <a
              href={`https://twitch.tv/${channel}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold text-xs text-white hover:text-purple-400 transition-colors truncate max-w-[120px] sm:max-w-[160px] flex items-center gap-1"
              title={`${lang === 'pl' ? 'Otwórz na Twitchu' : 'Open on Twitch'}: ${channel}`}
            >
              <span className="truncate">{channel}</span>
              <ExternalLink className="w-3 h-3 text-zinc-500 hover:text-zinc-300 shrink-0" />
            </a>
          </div>

          {isLive && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600/90 text-white uppercase tracking-wider shrink-0">
              <Radio className="w-2 h-2 animate-ping" />
              LIVE
            </span>
          )}

          {isModerator && (
            <button
              onClick={() => onOpenModView ? onOpenModView(channel) : openTwitchModView(channel)}
              title={lang === 'pl' ? `Panel moderatora: ${channel}` : `Mod View: ${channel}`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/25 hover:bg-amber-500/40 border border-amber-500/50 text-amber-300 hover:text-white transition-colors text-[10px] font-bold cursor-pointer shrink-0"
            >
              <Shield className="w-3 h-3 text-amber-400" />
              <span>Mod</span>
            </button>
          )}

          {viewerCount !== undefined && viewerCount > 0 && (
            <span className="text-[10px] text-zinc-400 hidden xl:inline-block shrink-0">
              {viewerCount.toLocaleString()} {lang === 'pl' ? 'widzów' : 'viewers'}
            </span>
          )}

          {gameName && (
            <span className="hidden 2xl:inline-block text-[10px] text-zinc-400 truncate max-w-[100px] bg-[#27272a] px-1.5 py-0.5 rounded shrink-0">
              {gameName}
            </span>
          )}
        </div>

        {/* Action Controls & Watch Time */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Watch Time Badge */}
          <div
            className="hidden sm:flex items-center gap-1 bg-zinc-800/90 border border-zinc-700/60 px-1.5 py-0.5 rounded text-[10px] text-purple-300 font-medium shrink-0"
            title={`${lang === 'pl' ? 'Czas w tej sesji / Łącznie' : 'Session time / Total time'}`}
          >
            <Clock className="w-3 h-3 text-purple-400 shrink-0" />
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
            disabled={isRefreshing}
            title={lang === 'pl' ? 'Odśwież i wznów transmisję na żywo (Auto-Play)' : 'Refresh and auto-resume live stream'}
            className={`p-1.5 rounded transition-all ${
              isRefreshing
                ? 'bg-purple-900/60 text-purple-300 cursor-wait'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
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
              key={`${channel}-${reloadKey}`}
              src={`https://player.twitch.tv/?channel=${channel.toLowerCase()}&${parentQuery}&autoplay=true&muted=true&time=${reloadKey}`}
              title={`Twitch Player - ${channel}`}
              className="absolute inset-0 w-full h-full border-0"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          )}

          {/* Unmute / interaction hint */}
          <div className="absolute bottom-2 left-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 backdrop-blur-xs text-[11px] text-zinc-300 px-2 py-1 rounded flex items-center gap-1.5 border border-zinc-800">
            <Volume2 className="w-3 h-3 text-purple-400" />
            <span>{lang === 'pl' ? 'Domyślnie wyciszone (zasady przeglądarek)' : 'Muted by default (browser policy)'}</span>
          </div>

          {/* Quick manual resume / sound button on hover */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
            <button
              onClick={() => {
                const player = playerInstanceRef.current;
                if (player) {
                  try {
                    player.setMuted(false);
                    player.play();
                  } catch {
                    try { player.play(); } catch {}
                  }
                }
              }}
              title={lang === 'pl' ? 'Włącz dźwięk i wznów odtwarzanie' : 'Unmute & play'}
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600/90 hover:bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3 h-3" />
              <span>{lang === 'pl' ? 'Dźwięk' : 'Unmute'}</span>
            </button>
          </div>
        </div>

        {/* Embedded Twitch Chat */}
        {showChat && (
          <div className="w-80 border-l border-[#2d2d34] bg-[#0e0e10] flex flex-col h-full shrink-0">
            <div className="px-3 py-1.5 bg-[#18181b] border-b border-[#2d2d34] flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-zinc-200">
                {lang === 'pl' ? 'Czat na żywo' : 'Live Chat'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenPopoutChat}
                  title={
                    lang === 'pl'
                      ? 'Otwórz czat w oknie Popout (omija blokady iframe i pozwala swobodnie pisać ze swojego konta)'
                      : 'Open popout chat window (bypasses iframe restrictions)'
                  }
                  className="hover:text-white p-1 rounded text-zinc-400 hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] font-bold text-purple-400 hover:text-purple-300">Popout</span>
                </button>
                <button
                  onClick={() => setShowChat(false)}
                  className="hover:text-white p-1 rounded text-zinc-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full relative overflow-hidden bg-[#0e0e10]">
              <iframe
                src={chatEmbedUrl}
                title={`Twitch Chat - ${channel}`}
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
