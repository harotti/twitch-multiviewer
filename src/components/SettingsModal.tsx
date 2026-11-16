import React, { useState, useEffect } from 'react';
import { X, Check, Key, Shield, HelpCircle, RotateCcw, Copy, PlayCircle } from 'lucide-react';
import { DEFAULT_CLIENT_ID, getOAuthClientId, getRedirectUri } from '../services/twitchApi';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToken: (token: string) => void;
  globalAutoPlay?: boolean;
  onUpdateGlobalAutoPlay?: (enabled: boolean) => void;
  lang: 'pl' | 'en';
}

export function SettingsModal({
  isOpen,
  onClose,
  onSaveToken,
  globalAutoPlay = true,
  onUpdateGlobalAutoPlay,
  lang = 'pl',
}: SettingsModalProps) {
  const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
  const [redirectUri, setRedirectUri] = useState('');
  const [customToken, setCustomToken] = useState('');
  const [autoPlay, setAutoPlay] = useState<boolean>(globalAutoPlay);
  const [copied, setCopied] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setClientId(getOAuthClientId());
      setRedirectUri(getRedirectUri());
      setCustomToken(localStorage.getItem('twitch_token') || '');
      const savedAutoPlay = localStorage.getItem('twitch_global_autoplay');
      setAutoPlay(savedAutoPlay !== null ? savedAutoPlay === 'true' : globalAutoPlay);
    }
  }, [isOpen, globalAutoPlay]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (clientId.trim()) {
      localStorage.setItem('twitch_custom_client_id', clientId.trim());
    } else {
      localStorage.removeItem('twitch_custom_client_id');
    }

    if (redirectUri.trim()) {
      localStorage.setItem('twitch_custom_redirect_uri', redirectUri.trim());
    } else {
      localStorage.removeItem('twitch_custom_redirect_uri');
    }

    if (customToken.trim()) {
      localStorage.setItem('twitch_token', customToken.trim());
      onSaveToken(customToken.trim());
    }

    // Save Global Auto-Play setting
    localStorage.setItem('twitch_global_autoplay', autoPlay ? 'true' : 'false');
    if (onUpdateGlobalAutoPlay) {
      onUpdateGlobalAutoPlay(autoPlay);
    }

    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      onClose();
    }, 700);
  };

  const handleResetDefaults = () => {
    localStorage.removeItem('twitch_custom_client_id');
    localStorage.removeItem('twitch_custom_redirect_uri');
    setClientId(DEFAULT_CLIENT_ID);
    setRedirectUri(window.location.origin + window.location.pathname);
    setAutoPlay(true);
    localStorage.setItem('twitch_global_autoplay', 'true');
    if (onUpdateGlobalAutoPlay) {
      onUpdateGlobalAutoPlay(true);
    }
  };

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#18181b] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1f1f23] border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">
                {lang === 'pl' ? 'Ustawienia Twitch & API' : 'Twitch API & Settings'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {lang === 'pl' ? 'Konfiguracja autoryzacji i połączenia' : 'Configure OAuth & Connection'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Playback Settings: Global Auto-Play */}
          <div className="p-3.5 bg-[#141416] border border-zinc-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    autoPlay
                      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/40'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}
                >
                  <PlayCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs truncate">
                      {lang === 'pl' ? 'Globalne Automatyczne Odtwarzanie' : 'Global Auto-Play'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                        autoPlay
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {autoPlay
                        ? lang === 'pl'
                          ? 'WŁĄCZONE'
                          : 'ENABLED'
                        : lang === 'pl'
                          ? 'WYŁĄCZONE'
                          : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {lang === 'pl'
                      ? 'Automatycznie wznawiaj odtwarzanie po dodaniu lub odświeżeniu streamu'
                      : 'Automatically resume playback when streams are added or refreshed'}
                  </p>
                </div>
              </div>

              {/* Accessible Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={autoPlay}
                onClick={() => setAutoPlay(!autoPlay)}
                title={
                  autoPlay
                    ? lang === 'pl'
                      ? 'Kliknij, aby wyłączyć automatyczne odtwarzanie'
                      : 'Click to disable auto-play'
                    : lang === 'pl'
                      ? 'Kliknij, aby włączyć automatyczne odtwarzanie'
                      : 'Click to enable auto-play'
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  autoPlay ? 'bg-purple-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoPlay ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-[10px] text-zinc-500 leading-relaxed pt-1.5 border-t border-zinc-800/80">
              {lang === 'pl'
                ? '⚡ Gdy aktywne: odtwarzacze natychmiast startują i wznawiają transmisję bez oczekiwania na kliknięcie przez użytkownika. Streamy uruchamiają się domyślnie wyciszone, aby spełnić politykę bezpieczeństwa przeglądarek.'
                : '⚡ When active: players automatically start and resume playback without waiting for user interaction. Streams start muted to comply with browser autoplay security policies.'}
            </p>
          </div>

          {/* Twitch Client ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-300">
                Twitch Client ID
              </label>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                {lang === 'pl' ? 'Przywróć domyślny' : 'Reset default'}
              </button>
            </div>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder={
                lang === 'pl'
                  ? 'Wklej własny Client ID z dev.twitch.tv'
                  : 'Paste your Client ID from dev.twitch.tv'
              }
              className="w-full bg-[#101012] border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-purple-500"
            />
            <p className="text-[11px] text-zinc-500">
              {lang === 'pl'
                ? 'Opcjonalne — wymagane wyłącznie dla logowania przez Okno OAuth (Popup). Wpisz Client ID własnej aplikacji z Twitch Developer Console.'
                : 'Optional — only needed for OAuth Popup login. Enter your own app Client ID from Twitch Developer Console.'}
            </p>
          </div>

          {/* Redirect URI */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-300">
              OAuth Redirect URI
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                className="flex-1 bg-[#101012] border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-purple-500"
              />
              <button
                type="button"
                onClick={copyRedirectUri}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center gap-1 shrink-0 transition-colors"
                title={lang === 'pl' ? 'Kopiuj adres URL' : 'Copy redirect URI'}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (lang === 'pl' ? 'Skopiowano' : 'Copied') : (lang === 'pl' ? 'Kopiuj' : 'Copy')}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">
              {lang === 'pl'
                ? 'Ten adres musi być wpisany w "OAuth Redirect URLs" Twojej aplikacji Twitch.'
                : 'Must match the redirect URI registered in your Twitch developer console.'}
            </p>
          </div>

          {/* Custom / Direct OAuth Token */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800">
            <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <span>{lang === 'pl' ? 'Ręczny Token OAuth (opcjonalnie)' : 'Manual OAuth Token (optional)'}</span>
              <span className="text-[10px] text-purple-400 font-normal">
                {lang === 'pl' ? 'Błyskawiczne logowanie' : 'Direct token'}
              </span>
            </label>
            <input
              type="password"
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              placeholder="oauth:xxxx lub xxxxx"
              className="w-full bg-[#101012] border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-purple-500"
            />
            <p className="text-[11px] text-zinc-500">
              {lang === 'pl'
                ? 'Jeśli przeglądarka blokuje przekierowania w ramce, możesz wkleić swój token Twitch bezpośrednio tutaj.'
                : 'If redirects are restricted in iframe sandboxes, you can paste your Twitch access token directly.'}
            </p>
          </div>

          {/* Security & Storage info */}
          <div className="p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-zinc-400 leading-relaxed">
              <span className="font-semibold text-zinc-200 block mb-0.5">
                {lang === 'pl' ? 'Bezpieczeństwo i prywatność' : 'Privacy & Local Storage'}
              </span>
              {lang === 'pl'
                ? 'Wszystkie tokeny i statystyki czasu oglądania są przechowywane wyłącznie w pamięci podręcznej Twojej przeglądarki (localStorage). Żadne dane nie są wysyłane na zewnętrzne serwery oprócz oficjalnego API Twitch.'
                : 'All tokens and watch times remain strictly in your browser localStorage. No data is sent anywhere except to official Twitch API.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#1f1f23] border-t border-zinc-800 flex items-center justify-between">
          <span className="text-[11px] text-emerald-400 font-medium">
            {savedMessage ? (lang === 'pl' ? '✓ Zapisano ustawienia!' : '✓ Settings saved!') : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
            >
              {lang === 'pl' ? 'Zamknij' : 'Close'}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{lang === 'pl' ? 'Zapisz' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
