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
  getLiveStreams,
  validateTwitchToken,
  cleanToken,
  LiveStreamData,
} from './services/twitchApi';
import { useWatchTimeTracker } from './hooks/useWatchTimeTracker';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { StreamGrid } from './components/StreamGrid';
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';
import { XayoModal } from './components/XayoModal';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const PRESETS_STORAGE_KEY = 'twitch_stream_presets_v1';
const ACTIVE_CHANNELS_KEY = 'twitch_active_channels';
const GRID_MODE_KEY = 'twitch_grid_mode';
const LANG_KEY = 'twitch_lang_pref';

export default function App() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<TwitchUser | null>(null);
  const [moderatedChannels, setModeratedChannels] = useState<TwitchChannelInfo[]>([]);
  const [followedChannels, setFollowedChannels] = useState<TwitchChannelInfo[]>([]);
  const [liveStreams, setLiveStreams] = useState<Record<string, LiveStreamData>>({});

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
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [lang, setLang] = useState<'pl' | 'en'>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'en' ? 'en' : 'pl';
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

  // Sync grid mode
  useEffect(() => {
    localStorage.setItem(GRID_MODE_KEY, gridMode);
  }, [gridMode]);

  // Sync language
  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

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

      // Fetch live statuses
      const allLogins = Array.from(
        new Set([
          ...modList.map((c) => c.broadcaster_login),
          ...followList.map((c) => c.broadcaster_login),
        ])
      );

      if (allLogins.length > 0) {
        const liveMap = await getLiveStreams(allLogins.slice(0, 80), activeToken);
        setLiveStreams(liveMap);
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
  }, [lang]);

  // On mount or when token changes, load data
  useEffect(() => {
    if (token) {
      loadTwitchData(token);
    }
  }, [token, loadTwitchData]);

  // Periodically refresh live streams (every 60s)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      const allLogins = Array.from(
        new Set([
          ...moderatedChannels.map((c) => c.broadcaster_login),
          ...followedChannels.map((c) => c.broadcaster_login),
          ...activeChannels,
        ])
      );
      if (allLogins.length > 0) {
        getLiveStreams(allLogins.slice(0, 80), token)
          .then((map) => setLiveStreams((prev) => ({ ...prev, ...map })))
          .catch(() => {});
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [token, moderatedChannels, followedChannels, activeChannels]);

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

  // Add channel to active stream list
  const handleAddChannel = (channelRaw: string) => {
    const clean = channelRaw.trim().toLowerCase();
    if (!clean) return;

    if (activeChannels.some((c) => c.toLowerCase() === clean)) {
      return;
    }

    setActiveChannels((prev) => [...prev, clean]);
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
    setActiveChannels(preset.channels);
    setTheaterChannel(null);
  };

  // Delete preset
  const handleDeletePreset = (id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  };

  // Toggle language
  const handleToggleLang = () => {
    setLang((prev) => (prev === 'pl' ? 'en' : 'pl'));
  };

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
        isLoadingData={isLoadingData}
        onRefreshChannels={() => token && loadTwitchData(token)}
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
            onToggleTheater={handleToggleTheater}
            onCloseStream={handleRemoveChannel}
            onAddChannel={handleAddChannel}
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
        lang={lang}
      />
    </div>
  );
}
