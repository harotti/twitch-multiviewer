import React, { useState } from 'react';
import {
  X,
  Shield,
  ExternalLink,
  MessageSquare,
  Clock,
  Radio,
  Sliders,
  Check,
  Copy,
  ChevronRight,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { TwitchChannelInfo } from '../types';
import { LiveStreamData } from '../services/twitchApi';

interface ModPanelDrawerProps {
  channel: string | null;
  onClose: () => void;
  moderatedChannels: TwitchChannelInfo[];
  liveStreams: Record<string, LiveStreamData>;
  onSelectChannel: (channel: string) => void;
  lang?: 'pl' | 'en';
}

export function ModPanelDrawer({
  channel,
  onClose,
  moderatedChannels,
  liveStreams,
  onSelectChannel,
  lang = 'pl',
}: ModPanelDrawerProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'commands'>('chat');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [timeoutUser, setTimeoutUser] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState('600');
  const [banUser, setBanUser] = useState('');
  const [banReason, setBanReason] = useState('');

  if (!channel) return null;

  const currentChannel = channel.toLowerCase();
  const live = liveStreams[currentChannel];
  const modMeta = moderatedChannels.find(
    (c) => c.broadcaster_login.toLowerCase() === currentChannel
  );

  // Domains for Twitch chat embed
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

      // If in AI Studio preview or cloud run
      if (host.includes('run.app') || (document.referrer && document.referrer.includes('google.com'))) {
        list.push('aistudio.google.com');
      }
    }
    return Array.from(new Set(list.filter(Boolean)));
  };

  const parents = getParentDomains();
  const parentQuery = parents.map((p) => `parent=${encodeURIComponent(p)}`).join('&');
  const chatEmbedUrl = `https://www.twitch.tv/embed/${encodeURIComponent(
    currentChannel
  )}/chat?${parentQuery}&darkpopout=true`;

  const handleOpenPopoutChat = (targetCh?: string) => {
    const ch = targetCh || currentChannel;
    const url = `https://www.twitch.tv/popout/${encodeURIComponent(ch.toLowerCase())}/chat?darkpopout=true`;
    const width = 450;
    const height = 780;
    const left = typeof window !== 'undefined' && window.screen.width ? Math.max(0, window.screen.width - width - 40) : 100;
    const top = 60;
    window.open(
      url,
      `twitch_popout_${ch.toLowerCase()}`,
      `width=${width},height=${height},top=${top},left=${left},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const QUICK_COMMANDS = [
    { label: 'Wyczyść czat', cmd: '/clear', desc: 'Usuwa dotychczasowe wiadomości z czatu' },
    { label: 'Tryb powolny (10s)', cmd: '/slow 10', desc: '1 wiadomość na 10 sekund' },
    { label: 'Wyłącz tryb powolny', cmd: '/slowoff', desc: 'Standardowa prędkość czatu' },
    { label: 'Tylko emotki', cmd: '/emoteonly', desc: 'Dozwolone wyłącznie emotki' },
    { label: 'Wyłącz tylko emotki', cmd: '/emoteonlyoff', desc: 'Przywraca zwykłe wiadomości' },
    { label: 'Tylko subskrybenci', cmd: '/subscribers', desc: 'Czat tylko dla subów' },
    { label: 'Dla wszystkich', cmd: '/subscribersoff', desc: 'Czat otwarty dla każdego' },
    { label: 'Dla obserwujących (10m)', cmd: '/followers 10m', desc: 'Obserwacja min. 10 minut' },
    { label: 'Wyłącz tryb obserwacji', cmd: '/followersoff', desc: 'Każdy może pisać' },
    { label: 'Unikalne wiadomości (R9K)', cmd: '/uniquechat', desc: 'Blokuje powtarzające się wiadomości' },
    { label: 'Wyłącz unikalne wiadomości', cmd: '/uniquechatoff', desc: 'Standardowy tryb wiadomości' },
  ];

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] md:w-[500px] bg-[#121214] border-l border-zinc-700/80 shadow-2xl flex flex-col"
    >
      {/* Top Header Bar */}
      <div className="p-3.5 bg-[#18181b] border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-white truncate capitalize">
                {modMeta?.broadcaster_name || currentChannel}
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                MOD VIEW
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              {live ? (
                <span className="flex items-center gap-1 text-red-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE • {live.viewer_count.toLocaleString()} widzów
                </span>
              ) : (
                <span className="text-zinc-500">Offline</span>
              )}
              {live?.game_name && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[130px]">{live.game_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenPopoutChat(currentChannel)}
            title={lang === 'pl' ? 'Otwórz czat w oknie Popout (omija blokady ramek Twitch)' : 'Open Popout Chat'}
            className="px-2 py-1 rounded-md text-amber-300 hover:text-black bg-amber-500/20 hover:bg-amber-400 text-[11px] font-bold border border-amber-500/40 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Popout</span>
          </button>
          <a
            href={`https://www.twitch.tv/moderator/${currentChannel}`}
            target="_blank"
            rel="noopener noreferrer"
            title={lang === 'pl' ? 'Otwórz pełny Mod View na Twitch w nowej karcie' : 'Open Twitch Mod View'}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors"
          >
            <Shield className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            title={lang === 'pl' ? 'Zamknij panel moderatora' : 'Close Mod View'}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Channel Switcher (if user moderates multiple channels) */}
      {moderatedChannels.length > 1 && (
        <div className="px-3.5 py-2 bg-[#161619] border-b border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[10px] text-zinc-500 shrink-0 font-medium">
            {lang === 'pl' ? 'Kanał:' : 'Channel:'}
          </span>
          {moderatedChannels.map((m) => {
            const isSelected = m.broadcaster_login.toLowerCase() === currentChannel;
            const isLive = liveStreams[m.broadcaster_login.toLowerCase()];
            return (
              <button
                key={m.broadcaster_id}
                onClick={() => onSelectChannel(m.broadcaster_login)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'bg-[#202025] hover:bg-[#282830] text-zinc-300'
                }`}
              >
                <span>{m.broadcaster_name}</span>
                {isLive && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-black' : 'bg-red-500 animate-pulse'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab Switcher: Live Czat vs Szybkie Polecenia Moderatora */}
      <div className="grid grid-cols-2 border-b border-zinc-800 bg-[#161619] text-xs font-semibold">
        <button
          onClick={() => setActiveTab('chat')}
          className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'border-amber-500 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{lang === 'pl' ? 'Czat Moderatora' : 'Mod Chat'}</span>
        </button>

        <button
          onClick={() => setActiveTab('commands')}
          className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'commands'
              ? 'border-amber-500 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{lang === 'pl' ? 'Narzędzia i Komendy' : 'Mod Tools & Commands'}</span>
        </button>
      </div>

      {/* Main Body */}
      {activeTab === 'chat' ? (
        <div className="flex-1 flex flex-col min-h-0 relative bg-[#0e0e10]">
          {/* Top Chat Action Bar */}
          <div className="px-3.5 py-2 bg-[#18181b] border-b border-zinc-800 flex items-center justify-between text-xs shrink-0">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{lang === 'pl' ? 'Tryb moderatora na żywo' : 'Live moderator mode'}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenPopoutChat(currentChannel)}
                title={
                  lang === 'pl'
                    ? 'Otwórz czat w oknie Popout (omija blokady ramek Twitch)'
                    : 'Open popout chat window'
                }
                className="text-[11px] font-bold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'pl' ? 'Otwórz Popout' : 'Popout Chat'}</span>
              </button>
            </div>
          </div>

          {/* Clean isolated iframe container for viewing live chat feed */}
          <div className="flex-1 w-full relative overflow-hidden bg-[#0e0e10]">
            <iframe
              src={chatEmbedUrl}
              title={`Mod View Chat - ${currentChannel}`}
              className="absolute inset-0 w-full h-full border-0"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            />
          </div>

          {/* Bottom info helper */}
          <div className="p-2.5 bg-[#18181b] border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 px-3 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenPopoutChat(currentChannel)}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              <span>{lang === 'pl' ? 'Otwórz Popout' : 'Open Popout'}</span>
            </button>
            <button
              onClick={() => setActiveTab('commands')}
              className="text-amber-400 hover:underline shrink-0 ml-2 font-medium cursor-pointer"
            >
              {lang === 'pl' ? 'Komendy' : 'Commands'} →
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Quick Timeout Generator */}
          <div className="p-3 bg-[#18181b] border border-zinc-800 rounded-xl space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>{lang === 'pl' ? 'Szybki Timeout (Wyciszenie)' : 'Quick Timeout'}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={timeoutUser}
                onChange={(e) => setTimeoutUser(e.target.value)}
                placeholder={lang === 'pl' ? 'Nick użytkownika...' : 'Username...'}
                className="bg-[#121214] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white placeholder-zinc-500 focus:outline-hidden focus:border-amber-500 text-xs"
              />
              <select
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(e.target.value)}
                className="bg-[#121214] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-amber-500 text-xs cursor-pointer"
              >
                <option value="60">1 minuta (60s)</option>
                <option value="300">5 minut (300s)</option>
                <option value="600">10 minut (600s)</option>
                <option value="3600">1 godzina (3600s)</option>
                <option value="86400">24 godziny (86400s)</option>
              </select>
            </div>

            {timeoutUser.trim() && (
              <div className="flex items-center justify-between p-2 bg-[#121214] rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300">
                <span>/timeout {timeoutUser.trim()} {timeoutSeconds}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCommand(`/timeout ${timeoutUser.trim()} ${timeoutSeconds}`)}
                  className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 font-sans text-xs flex items-center gap-1"
                >
                  {copiedCmd === `/timeout ${timeoutUser.trim()} ${timeoutSeconds}` ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Skopiowano</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Kopiuj</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Quick Ban Generator */}
          <div className="p-3 bg-[#18181b] border border-zinc-800 rounded-xl space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-red-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{lang === 'pl' ? 'Banowanie Użytkownika' : 'Ban User'}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={banUser}
                onChange={(e) => setBanUser(e.target.value)}
                placeholder={lang === 'pl' ? 'Nick użytkownika...' : 'Username...'}
                className="bg-[#121214] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white placeholder-zinc-500 focus:outline-hidden focus:border-red-500 text-xs"
              />
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder={lang === 'pl' ? 'Powód (opcjonalnie)...' : 'Reason (optional)...'}
                className="bg-[#121214] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white placeholder-zinc-500 focus:outline-hidden focus:border-red-500 text-xs"
              />
            </div>

            {banUser.trim() && (
              <div className="flex items-center justify-between p-2 bg-[#121214] rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300">
                <span>/ban {banUser.trim()} {banReason.trim()}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCommand(`/ban ${banUser.trim()}${banReason.trim() ? ` ${banReason.trim()}` : ''}`)}
                  className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/40 font-sans text-xs flex items-center gap-1"
                >
                  {copiedCmd?.startsWith('/ban') ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Skopiowano</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Kopiuj</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Quick Chat Presets List */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-300 block mb-1">
              {lang === 'pl' ? 'Szybkie Polecenia Czatu (Kliknij, aby skopiować)' : 'Quick Chat Commands (Click to copy)'}
            </span>
            <div className="space-y-1.5">
              {QUICK_COMMANDS.map((item) => {
                const isCopied = copiedCmd === item.cmd;
                return (
                  <div
                    key={item.cmd}
                    onClick={() => handleCopyCommand(item.cmd)}
                    className="p-2.5 bg-[#18181b] hover:bg-[#202025] border border-zinc-800 hover:border-amber-500/50 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs group-hover:text-amber-400 transition-colors">
                          {item.label}
                        </span>
                        <code className="text-[11px] bg-zinc-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">
                          {item.cmd}
                        </code>
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">
                        {item.desc}
                      </span>
                    </div>

                    <div className="shrink-0 text-zinc-500 group-hover:text-amber-400">
                      {isCopied ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Skopiowano
                        </span>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
