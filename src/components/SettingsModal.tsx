import React, { useState, useEffect } from 'react';
import { X, Check, Key, Shield, HelpCircle, RotateCcw, Copy } from 'lucide-react';
import { DEFAULT_CLIENT_ID, getEffectiveClientId, getRedirectUri } from '../services/twitchApi';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToken: (token: string) => void;
  lang: 'pl' | 'en';
}

export function SettingsModal({
  isOpen,
  onClose,
  onSaveToken,
  lang = 'pl',
}: SettingsModalProps) {
  const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
  const [redirectUri, setRedirectUri] = useState('');
  const [customToken, setCustomToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setClientId(getEffectiveClientId());
      setRedirectUri(getRedirectUri());
      setCustomToken(localStorage.getItem('twitch_token') || '');
    }
  }, [isOpen]);

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
              placeholder="np. vch0e4gq78sqrbnfvy3zs2yb2mw5jy"
              className="w-full bg-[#101012] border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-purple-500"
            />
            <p className="text-[11px] text-zinc-500">
              {lang === 'pl'
                ? 'Domyślny Client ID pochodzi z zaimportowanego projektu. Możesz także podać własny z Twitch Developer Console.'
                : 'Default Client ID comes from the imported project or you can specify your own.'}
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
