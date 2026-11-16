import { useState, useEffect, useCallback } from 'react';
import {
  TwitchUser,
  TwitchChannelInfo,
  GridMode,
  StreamPreset,
} from './types';
import {
  getStoredToken,
  getCurrentUser,
  getModeratedChannels,
  getFollowedChannels,
  getFollowedLiveStreams,
  getLiveStreams,
  getLiveStreamsGQL,
  validateTwitchToken,
  cleanToken,
  LiveStreamData,
} from './services/twitchApi';
import { useWatchTimeTracker } from './hooks/useWatchTimeTracker';
import { useGlobalKeyboardShortcuts } from './hooks/useGlobalKeyboardShortcuts';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { StreamGrid } from './components/StreamGrid';
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';
import { XayoModal } from './components/XayoModal';
import { ModPanelDrawer } from './components/ModPanelDrawer';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const PRESETS_STORAGE_KEY = 'twitch_stream_presets_v1';
const ACTIVE_CHANNELS_KEY = 'twitch_active_channels';
const RECENT_STREAMS_KEY = 'twitch_recent_streams_v1';
const GRID_MODE_KEY = 'twitch_grid_mode';
const LANG_KEY = 'twitch_lang_pref';
const GLOBAL_AUTOPLAY_KEY = 'twitch_global_autoplay';

export default function App() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<TwitchUser | null>(null);
  const [moderatedChannels, setModeratedChannels] = useState<TwitchChannelInfo[]>([]);
  const [followedChannels, setFollowedChannels] = useState<TwitchChannelInfo[]>([]);
  const [liveStreams, setLiveStreams] = useState<Record<string, LiveStreamData>>({});

  const [recentStreams, setRecentStreams] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_STREAMS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 5);
        }
      }
    } catch {}
    return [];
  });

  const [activeChannels, setActiveChannels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_CHANNELS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [theaterChannel, setTheaterChannel] = useState<string | null>(null);
  const [gridMode, setGridMode] = useState<GridMode>(() => {
    return (localStorage.getItem(GRID_MODE_KEY) as GridMode) || 'auto';
  });

  const [presets, setPresets] = useState<StreamPreset[]>(() => {
    try {
      const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'default-esports',
        name: 'Esport & Gaming',
        channels: ['eslcs', 'riotgames'],
        createdAt: Date.now(),
      },
    ];
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [xayoModalOpen, setXayoModalOpen] = useState<boolean>(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);
  const [modPanelChannel, setModPanelChannel] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [lang, setLang] = useState<'pl' | 'en'>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'en' ? 'en' : 'pl';
  });

  const [globalAutoPlay, setGlobalAutoPlay] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(GLOBAL_AUTOPLAY_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Watch Time Engine
  const {
    stats,
    resetAllStats,
    resetChannelStat,
  } = useWatchTimeTracker(activeChannels);

  // Sync active channels to localStorage
  useEffect(() => {
    localStorage.setItem(ACTIVE_CHANNELS_KEY, JSON.stringify(activeChannels));
  }, [activeChannels]);

  // Sync recent streams to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(RECENT_STREAMS_KEY, JSON.stringify(recentStreams));
    } catch {}
  }, [recentStreams]);

  // Sync grid mode
  useEffect(() => {
    localStorage.setItem(GRID_MODE_KEY, gridMode);
  }, [gridMode]);

  // Sync language
  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  // Sync global auto-play preference
  useEffect(() => {
    localStorage.setItem(GLOBAL_AUTOPLAY_KEY, globalAutoPlay ? 'true' : 'false');
  }, [globalAutoPlay]);

  // Sync presets
  useEffect(() => {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  // Listen for OAuth token callback via window message (from popup window)
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'TWITCH_AUTH_TOKEN') {
        const receivedToken = cleanToken(event.data.token);
        if (receivedToken) {
          handleTokenSuccess(receivedToken);
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);

    // If opened as a popup and has access_token in hash, notify parent and close
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const returnedToken = params.get('access_token');
      if (returnedToken && window.opener) {
        window.opener.postMessage({ type: 'TWITCH_AUTH_TOKEN', token: returnedToken }, '*');
        window.close();
      }
    }

    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  // Load user data & channels from Twitch API
  const loadTwitchData = useCallback(async (activeToken: string) => {
    setIsLoadingData(true);
    setErrorMessage(null);

    try {
      // First validate token to identify issued client_id
      await validateTwitchToken(activeToken);

      const userData = await getCurrentUser(activeToken);
      if (!userData) {
        throw new Error('Nie udało się pobrać profilu użytkownika.');
      }
      setUser(userData);

      // Fetch moderated and followed channels
      const [modList, followList] = await Promise.all([
        getModeratedChannels(userData.id, activeToken),
        getFollowedChannels(userData.id, activeToken),
      ]);

      setModeratedChannels(modList);
      setFollowedChannels(followList);

      // Fetch live statuses across all followed channels, mod channels, and active grid
      const allLogins = Array.from(
        new Set([
          ...modList.map((c) => c.broadcaster_login.toLowerCase().trim()),
          ...followList.map((c) => c.broadcaster_login.toLowerCase().trim()),
          ...activeChannels.map((c) => c.toLowerCase().trim()),
        ])
      );

      try {
        const [followedLiveMap, directLiveMap] = await Promise.all([
          getFollowedLiveStreams(userData.id, activeToken),
          allLogins.length > 0 ? getLiveStreams(allLogins, activeToken) : Promise.resolve({}),
        ]);
        setLiveStreams({ ...followedLiveMap, ...directLiveMap });
      } catch (streamErr) {
        console.warn('Failed to fetch initial live statuses', streamErr);
      }

      setToastMessage(
        lang === 'pl'
          ? `Zalogowano jako ${userData.display_name}! Załadowano ${followList.length} kanałów.`
          : `Connected as ${userData.display_name}! Loaded ${followList.length} channels.`
      );
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to load Twitch user info', err);
      setErrorMessage(err.message || 'Błąd podczas komunikacji z Twitch API');
      if (err.message && err.message.includes('401')) {
        setToken(null);
        setUser(null);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [lang, activeChannels]);

  // On mount or when token changes, load data
  useEffect(() => {
    if (token) {
      loadTwitchData(token);
    }
  }, [token, loadTwitchData]);

  // Periodically refresh live streams (every 30s with hybrid GQL fallback)
  useEffect(() => {
    const poll = async () => {
      const allLogins = Array.from(
        new Set([
          ...moderatedChannels.map((c) => c.broadcaster_login.toLowerCase().trim()),
          ...followedChannels.map((c) => c.broadcaster_login.toLowerCase().trim()),
          ...activeChannels.map((c) => c.toLowerCase().trim()),
        ])
      );
      if (!allLogins.length) return;
      try {
        const [followedLive, directLive] = await Promise.all([
          token && user?.id ? getFollowedLiveStreams(user.id, token) : Promise.resolve({}),
          getLiveStreams(allLogins, token),
        ]);
        setLiveStreams((prev) => ({ ...prev, ...followedLive, ...directLive }));
      } catch (err) {
        console.warn('Periodic live stream polling failed', err);
      }
    };

    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [token, user?.id, moderatedChannels, followedChannels, activeChannels]);

  // Whenever activeChannels updates, ensure live status is immediately retrieved
  useEffect(() => {
    if (activeChannels.length === 0) return;
    const missing = activeChannels.filter((ch) => !liveStreams[ch.toLowerCase().trim()]);
    if (missing.length > 0) {
      getLiveStreams(missing, token)
        .then((map) => {
          if (Object.keys(map).length > 0) {
            setLiveStreams((prev) => ({ ...prev, ...map }));
          }
        })
        .catch(() => {});
    }
  }, [activeChannels, token, liveStreams]);

  // Player-level real-time live detection callback
  const handleStreamLiveDetected = useCallback(
    (channel: string) => {
      const lower = channel.toLowerCase().trim();
      if (!liveStreams[lower]) {
        getLiveStreamsGQL([lower]).then((gqlMap) => {
          if (gqlMap[lower]) {
            setLiveStreams((prev) => ({ ...prev, [lower]: gqlMap[lower] }));
          } else {
            setLiveStreams((prev) => ({
              ...prev,
              [lower]: {
                user_login: lower,
                user_name: channel,
                game_name: '',
                title: '',
                viewer_count: 0,
                thumbnail_url: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${lower}-320x180.jpg`,
                started_at: new Date().toISOString(),
              },
            }));
          }
        });
      }
    },
    [liveStreams]
  );

  // Trigger login modal
  const handleOpenLogin = () => {
    setLoginModalOpen(true);
  };

  // Called when token is successfully obtained / validated
  const handleTokenSuccess = (newToken: string) => {
    const cleaned = cleanToken(newToken);
    localStorage.setItem('twitch_token', cleaned);
    setToken(cleaned);
    loadTwitchData(cleaned);
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('twitch_token');
    localStorage.removeItem('twitch_token_client_id');
    setToken(null);
    setUser(null);
    setModeratedChannels([]);
    setFollowedChannels([]);
    setLiveStreams({});
    setToastMessage(lang === 'pl' ? 'Wylogowano pomyślnie.' : 'Successfully logged out.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Update Global Auto-Play setting
  const handleUpdateGlobalAutoPlay = (enabled: boolean) => {
    setGlobalAutoPlay(enabled);
    localStorage.setItem(GLOBAL_AUTOPLAY_KEY, enabled ? 'true' : 'false');

    if (enabled && typeof window !== 'undefined') {
      const registry = (window as any).__twitchPlayers;
      if (registry) {
        registry.forEach((p: any) => {
          try {
            if (p && typeof p.play === 'function') {
              p.play();
            }
          } catch {}
        });
      }
      setToastMessage(
        lang === 'pl'
          ? '▶ Włączono Globalne Auto-Play – streamy wznawiają się automatycznie'
          : '▶ Global Auto-Play enabled – streams resume playback automatically'
      );
    } else {
      setToastMessage(
        lang === 'pl'
          ? '⏸ Wyłączono Globalne Auto-Play'
          : '⏸ Global Auto-Play disabled'
      );
    }
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Record channel(s) in recent streams history (max 5)
  const recordRecentStream = useCallback((channelsToAdd: string | string[]) => {
    const list = Array.isArray(channelsToAdd) ? channelsToAdd : [channelsToAdd];
    const cleaned = list.map((c) => c.toLowerCase().trim()).filter(Boolean);
    if (!cleaned.length) return;

    setRecentStreams((prev) => {
      const merged = [...cleaned.reverse(), ...prev];
      const deduped = Array.from(new Set(merged));
      return deduped.slice(0, 5);
    });
  }, []);

  const handleRemoveRecentStream = useCallback((channel: string) => {
    const clean = channel.toLowerCase().trim();
    setRecentStreams((prev) => prev.filter((c) => c !== clean));
  }, []);

  const handleClearRecentStreams = useCallback(() => {
    setRecentStreams([]);
  }, []);

  // Add channel to active stream list
  const handleAddChannel = (channelRaw: string) => {
    const clean = channelRaw.trim().toLowerCase();
    if (!clean) return;

    recordRecentStream(clean);

    if (activeChannels.some((c) => c.toLowerCase() === clean)) {
      return;
    }

    setActiveChannels((prev) => [...prev, clean]);

    // If global auto-play is enabled, ensure newly added stream starts playback immediately
    if (globalAutoPlay) {
      setTimeout(() => {
        const registry = (window as any).__twitchPlayers;
        const player = registry?.get(clean);
        if (player && typeof player.play === 'function') {
          try {
            player.play();
          } catch {}
        }
      }, 1000);
    }
  };

  // Remove channel from active stream list
  const handleRemoveChannel = (channel: string) => {
    const clean = channel.toLowerCase();
    setActiveChannels((prev) => prev.filter((c) => c.toLowerCase() !== clean));
    if (theaterChannel?.toLowerCase() === clean) {
      setTheaterChannel(null);
    }
  };

  // Clear all streams
  const handleClearAllStreams = () => {
    setActiveChannels([]);
    setTheaterChannel(null);
  };

  // Toggle theater mode
  const handleToggleTheater = (channel: string) => {
    const clean = channel.toLowerCase();
    setTheaterChannel((prev) => (prev === clean ? null : clean));
  };

  // Save preset
  const handleSavePreset = (name: string) => {
    if (activeChannels.length === 0) return;
    const newPreset: StreamPreset = {
      id: `preset-${Date.now()}`,
      name: name.trim(),
      channels: [...activeChannels],
      createdAt: Date.now(),
    };
    setPresets((prev) => [newPreset, ...prev]);
  };

  // Load preset
  const handleLoadPreset = (preset: StreamPreset) => {
    recordRecentStream(preset.channels);
    setActiveChannels(preset.channels);
    setTheaterChannel(null);

    // If global auto-play is enabled, ensure all streams in the preset start playing
    if (globalAutoPlay) {
      setTimeout(() => {
        const registry = (window as any).__twitchPlayers;
        if (registry) {
          preset.channels.forEach((ch) => {
            const player = registry.get(ch.toLowerCase());
            if (player && typeof player.play === 'function') {
              try {
                player.play();
              } catch {}
            }
          });
        }
      }, 1000);
    }
  };

  // Delete preset
  const handleDeletePreset = (id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  };

  // Toggle language
  const handleToggleLang = () => {
    setLang((prev) => (prev === 'pl' ? 'en' : 'pl'));
  };

  // ==========================================
  // GLOBAL KEYBOARD SHORTCUTS LOGIC & HANDLERS
  // ==========================================
  const GRID_CYCLE_MODES: GridMode[] = ['auto', '1x1', '1x2', '2x2', '3x2'];

  // G shortcut: cycle grid layouts
  const handleCycleGridMode = useCallback(
    (direction: 'forward' | 'backward' = 'forward') => {
      setTheaterChannel(null);
      setGridMode((prevMode) => {
        const curIdx = GRID_CYCLE_MODES.indexOf(prevMode);
        let nextIdx = 0;
        if (curIdx === -1) {
          nextIdx = 0;
        } else if (direction === 'forward') {
          nextIdx = (curIdx + 1) % GRID_CYCLE_MODES.length;
        } else {
          nextIdx = (curIdx - 1 + GRID_CYCLE_MODES.length) % GRID_CYCLE_MODES.length;
        }
        const nextMode = GRID_CYCLE_MODES[nextIdx];
        setToastMessage(
          lang === 'pl'
            ? `📐 Siatka: ${nextMode.toUpperCase()} (skrót: G)`
            : `📐 Layout: ${nextMode.toUpperCase()} (shortcut: G)`
        );
        setTimeout(() => setToastMessage(null), 1800);
        return nextMode;
      });
    },
    [lang]
  );

  // Space shortcut: pause / resume playback
  const handleTogglePlayPause = useCallback(() => {
    const targetChannel = theaterChannel || activeChannels[0];
    if (!targetChannel) {
      setToastMessage(
        lang === 'pl'
          ? 'Brak aktywnego streamu do sterowania odtwarzaniem'
          : 'No active stream to control playback'
      );
      setTimeout(() => setToastMessage(null), 2000);
      return;
    }

    const registry = (window as any).__twitchPlayers;
    const player = registry?.get(targetChannel.toLowerCase());

    if (player && typeof player.isPaused === 'function') {
      try {
        if (player.isPaused()) {
          player.play();
          setToastMessage(
            lang === 'pl' ? `▶ Wznowiono: ${targetChannel}` : `▶ Resumed: ${targetChannel}`
          );
        } else {
          player.pause();
          setToastMessage(
            lang === 'pl' ? `⏸ Wstrzymano: ${targetChannel}` : `⏸ Paused: ${targetChannel}`
          );
        }
        setTimeout(() => setToastMessage(null), 2000);
        return;
      } catch (e) {
        console.warn('Could not toggle Twitch player play/pause', e);
      }
    }

    setToastMessage(
      lang === 'pl'
        ? `Sterowanie odtwarzaczem: ${targetChannel} (Spacja)`
        : `Player control: ${targetChannel} (Space)`
    );
    setTimeout(() => setToastMessage(null), 2000);
  }, [theaterChannel, activeChannels, lang]);

  // M shortcut: toggle moderation drawer
  const handleToggleModDrawer = useCallback(() => {
    if (modPanelChannel) {
      setModPanelChannel(null);
      setToastMessage(
        lang === 'pl' ? 'Zamknięto panel moderatora (M)' : 'Closed moderator panel (M)'
      );
      setTimeout(() => setToastMessage(null), 1800);
    } else {
      const candidate =
        theaterChannel ||
        moderatedChannels[0]?.broadcaster_login ||
        activeChannels[0] ||
        null;

      if (candidate) {
        setModPanelChannel(candidate.toLowerCase());
        setToastMessage(
          lang === 'pl'
            ? `🛡 Otwarto panel moderatora: ${candidate} (M)`
            : `🛡 Opened moderator panel: ${candidate} (M)`
        );
        setTimeout(() => setToastMessage(null), 2000);
      } else {
        setToastMessage(
          lang === 'pl'
            ? 'Brak kanałów do moderacji (dodaj stream lub zaloguj się)'
            : 'No channels available for moderator view'
        );
        setTimeout(() => setToastMessage(null), 2500);
      }
    }
  }, [modPanelChannel, theaterChannel, moderatedChannels, activeChannels, lang]);

  // T shortcut: toggle theater mode
  const handleToggleTheaterShortcut = useCallback(() => {
    if (theaterChannel) {
      setTheaterChannel(null);
      setToastMessage(
        lang === 'pl' ? 'Wyjście z trybu kinowego (T)' : 'Exited theater mode (T)'
      );
      setTimeout(() => setToastMessage(null), 1800);
    } else if (activeChannels.length > 0) {
      const target = activeChannels[0].toLowerCase();
      setTheaterChannel(target);
      setToastMessage(
        lang === 'pl' ? `🎭 Tryb kinowy: ${target} (T)` : `🎭 Theater mode: ${target} (T)`
      );
      setTimeout(() => setToastMessage(null), 1800);
    }
  }, [theaterChannel, activeChannels, lang]);

  // Escape shortcut: close active modal/drawer/theater
  const handleEscape = useCallback(() => {
    if (shortcutsModalOpen) {
      setShortcutsModalOpen(false);
      return;
    }
    if (loginModalOpen) {
      setLoginModalOpen(false);
      return;
    }
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }
    if (xayoModalOpen) {
      setXayoModalOpen(false);
      return;
    }
    if (modPanelChannel) {
      setModPanelChannel(null);
      return;
    }
    if (theaterChannel) {
      setTheaterChannel(null);
      return;
    }
  }, [shortcutsModalOpen, loginModalOpen, settingsOpen, xayoModalOpen, modPanelChannel, theaterChannel]);

  // 1-9 shortcuts: select stream index
  const handleSelectStreamIndex = useCallback(
    (index: number) => {
      if (activeChannels[index]) {
        const target = activeChannels[index].toLowerCase();
        setTheaterChannel((current) => (current === target ? null : target));
        setToastMessage(
          lang === 'pl'
            ? `Stream #${index + 1}: ${target}`
            : `Stream #${index + 1}: ${target}`
        );
        setTimeout(() => setToastMessage(null), 1800);
      }
    },
    [activeChannels, lang]
  );

  // Bind Global Keyboard Shortcuts
  useGlobalKeyboardShortcuts({
    onTogglePlayPause: handleTogglePlayPause,
    onToggleModDrawer: handleToggleModDrawer,
    onCycleGridMode: handleCycleGridMode,
    onToggleTheater: handleToggleTheaterShortcut,
    onToggleSidebar: () => setSidebarOpen((prev) => !prev),
    onToggleXayoModal: () => setXayoModalOpen((prev) => !prev),
    onToggleSettings: () => setSettingsOpen((prev) => !prev),
    onToggleShortcutsModal: () => setShortcutsModalOpen((prev) => !prev),
    onEscape: handleEscape,
    onSelectStreamIndex: handleSelectStreamIndex,
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0e0e10] text-[#efeff1] font-sans">
      {/* Sidebar */}
      <Sidebar
        user={user}
        token={token}
        moderatedChannels={moderatedChannels}
        followedChannels={followedChannels}
        liveStreams={liveStreams}
        activeChannels={activeChannels}
        watchStats={stats}
        presets={presets}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        onLogin={handleOpenLogin}
        onLogout={handleLogout}
        onAddChannel={handleAddChannel}
        onRemoveChannel={handleRemoveChannel}
        onResetStats={resetAllStats}
        onResetChannelStat={resetChannelStat}
        onSavePreset={handleSavePreset}
        onLoadPreset={handleLoadPreset}
        onDeletePreset={handleDeletePreset}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenModView={(ch) => setModPanelChannel(ch.toLowerCase())}
        isLoadingData={isLoadingData}
        onRefreshChannels={async () => {
          if (token) {
            await loadTwitchData(token);
          } else {
            const allLogins = Array.from(
              new Set([
                ...moderatedChannels.map((c) => c.broadcaster_login.toLowerCase().trim()),
                ...followedChannels.map((c) => c.broadcaster_login.toLowerCase().trim()),
                ...activeChannels.map((c) => c.toLowerCase().trim()),
              ])
            );
            if (allLogins.length > 0) {
              setIsLoadingData(true);
              try {
                const map = await getLiveStreams(allLogins, null);
                setLiveStreams((prev) => ({ ...prev, ...map }));
              } finally {
                setIsLoadingData(false);
              }
            }
          }
        }}
        recentStreams={recentStreams}
        onRemoveRecentStream={handleRemoveRecentStream}
        onClearRecentStreams={handleClearRecentStreams}
        lang={lang}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeChannelsCount={activeChannels.length}
          gridMode={gridMode}
          onChangeGridMode={(mode) => {
            setGridMode(mode);
            setTheaterChannel(null);
          }}
          onAddChannel={handleAddChannel}
          onClearAllStreams={handleClearAllStreams}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenXayoModal={() => setXayoModalOpen(true)}
          onOpenShortcuts={() => setShortcutsModalOpen(true)}
          lang={lang}
          onToggleLang={handleToggleLang}
        />

        {/* Success toast notification */}
        {toastMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 px-4 py-2 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenLogin}
                className="underline font-semibold hover:text-white cursor-pointer"
              >
                {lang === 'pl' ? 'Otwórz okno logowania' : 'Open login dialog'}
              </button>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-amber-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Video Player Grid */}
        <main className="flex-1 min-h-0 relative overflow-hidden bg-[#0e0e10]">
          <StreamGrid
            activeChannels={activeChannels}
            watchStats={stats}
            liveStreams={liveStreams}
            moderatedChannels={moderatedChannels}
            theaterChannel={theaterChannel}
            gridMode={gridMode}
            globalAutoPlay={globalAutoPlay}
            onToggleTheater={handleToggleTheater}
            onCloseStream={handleRemoveChannel}
            onAddChannel={handleAddChannel}
            onOpenModView={(ch) => setModPanelChannel(ch.toLowerCase())}
            onStreamLiveDetected={handleStreamLiveDetected}
            lang={lang}
          />
        </main>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleTokenSuccess}
        lang={lang}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaveToken={handleTokenSuccess}
        globalAutoPlay={globalAutoPlay}
        onUpdateGlobalAutoPlay={handleUpdateGlobalAutoPlay}
        lang={lang}
      />

      {/* Xayo Watch Time Modal Dashboard */}
      <XayoModal
        isOpen={xayoModalOpen}
        onClose={() => setXayoModalOpen(false)}
        currentUser={user}
        followedChannels={followedChannels}
        moderatedChannels={moderatedChannels}
        liveStreams={liveStreams}
        activeChannels={activeChannels}
        onAddChannel={handleAddChannel}
        onRemoveChannel={handleRemoveChannel}
        onOpenModView={(ch) => setModPanelChannel(ch.toLowerCase())}
        lang={lang}
      />

      {/* In-App Twitch Moderator Panel Drawer */}
      <ModPanelDrawer
        channel={modPanelChannel}
        onClose={() => setModPanelChannel(null)}
        moderatedChannels={moderatedChannels}
        liveStreams={liveStreams}
        onSelectChannel={(ch) => setModPanelChannel(ch.toLowerCase())}
        lang={lang}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
