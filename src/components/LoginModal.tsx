import React, { useState } from 'react';
import {
  X,
  Key,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import {
  validateTwitchToken,
  buildTwitchAuthUrl,
  getEffectiveClientId,
  getRedirectUri,
  DEFAULT_CLIENT_ID,
} from '../services/twitchApi';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
  lang?: 'pl' | 'en';
}

export function LoginModal({
  isOpen,
  onClose,
  onSuccess,
  lang = 'pl',
}: LoginModalProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'token' | 'oauth'>('token');
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  if (!isOpen) return null;

  const currentRedirectUri = getRedirectUri();
  const currentClientId = getEffectiveClientId();

  const handleValidateAndLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = tokenInput.trim();
    if (!raw) {
      setValidationError(
        lang === 'pl'
          ? 'Proszę wkleić token autoryzacyjny.'
          : 'Please paste your authorization token.'
      );
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setSuccessInfo(null);

    const result = await validateTwitchToken(raw);

    setIsValidating(false);

    if (result.valid) {
      setSuccessInfo(
        lang === 'pl'
          ? `Sukces! Zalogowano jako ${result.login}.`
          : `Success! Authenticated as ${result.login}.`
      );
      setTimeout(() => {
        onSuccess(raw.replace(/^oauth:/i, '').trim());
        onClose();
      }, 700);
    } else {
      setValidationError(
        result.error ||
          (lang === 'pl'
            ? 'Nieprawidłowy token. Upewnij się, że token jest aktywny.'
            : 'Invalid token. Please check that your token is active.')
      );
    }
  };

  const handleOpenOAuthPopup = () => {
    const authUrl = buildTwitchAuthUrl();
    const width = 600;
    const height = 750;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      'twitch_oauth_window',
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );

    if (!popup) {
      setValidationError(
        lang === 'pl'
          ? 'Przeglądarka zablokowała wyskakujące okno (popup). Zezwól na wyskakujące okna lub skorzystaj z metody tokenu.'
          : 'Browser blocked the popup window. Please allow popups or use the token method.'
      );
    }
  };

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(currentRedirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#18181b] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1f1f23] border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#9146ff] text-white flex items-center justify-center shadow-md shadow-purple-950">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M2.149 0l-1.612 4.16v16.035h5.362v3.805h3.83l3.778-3.805h4.825l5.668-5.668V0H2.149zm17.917 13.095l-3.23 3.232H11.5l-3.284 3.285v-3.285H4.632V2.148h15.434v10.947z" />
                <polygon points="16.08 5.733 13.937 5.733 13.937 11.454 16.08 11.454" />
                <polygon points="11.002 5.733 8.86 5.733 8.86 11.454 11.002 11.454" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">
                {lang === 'pl' ? 'Logowanie do Twitch' : 'Twitch Authentication'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {lang === 'pl'
                  ? 'Wybierz metodę, aby załadować swoje kanały'
                  : 'Choose a method to sync your channels'}
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

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 border-b border-zinc-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('token')}
            className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'token'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{lang === 'pl' ? 'Token Twitch (Zalecane)' : 'Twitch Token (Quick)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('oauth')}
            className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'oauth'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{lang === 'pl' ? 'Okno OAuth (Popup)' : 'OAuth Popup'}</span>
          </button>
        </div>

        {/* Tab 1: Token Input (Instant & 100% Reliable) */}
        {activeTab === 'token' && (
          <div className="p-5 space-y-4 text-xs">
            <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>
                  {lang === 'pl'
                    ? 'Najszybsza metoda logowania (10 sekund)'
                    : 'Fastest Login Method (10 seconds)'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                {lang === 'pl'
                  ? 'Twitch wymaga autoryzowanego tokenu z uprawnieniami do odczytu obserwowanych i moderowanych kanałów. Możesz go bezpiecznie wygenerować jednym kliknięciem:'
                  : 'Twitch requires an authorized token to read followed and moderated channels. You can safely generate one with 1 click:'}
              </p>
              <a
                href="https://twitchtokengenerator.com/quick/user:read:follows+user:read:moderated_channels"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#9146ff] hover:bg-[#772ce8] text-white rounded-lg font-semibold text-xs transition-colors shadow-md shadow-purple-950"
              >
                <span>{lang === 'pl' ? 'Wygeneruj Token Twitch' : 'Generate Twitch Token'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Token input form */}
            <form onSubmit={handleValidateAndLogin} className="space-y-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-200 block">
                  {lang === 'pl' ? 'Wklej swój Token Twitch:' : 'Paste your Twitch Token:'}
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="oauth:xxxxxxxxxx lub xxxxxxxxxx"
                  className="w-full bg-[#101012] border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-purple-500 placeholder-zinc-600"
                />
                <span className="text-[10px] text-zinc-500 block">
                  {lang === 'pl'
                    ? 'Obsługuje format "oauth:xxxx" oraz czysty ciąg tokenu.'
                    : 'Accepts both "oauth:xxxx" format and bare tokens.'}
                </span>
              </div>

              {/* Feedback messages */}
              {validationError && (
                <div className="p-2.5 bg-red-950/60 border border-red-800/80 rounded-lg flex items-center gap-2 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {successInfo && (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/80 rounded-lg flex items-center gap-2 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successInfo}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isValidating || !tokenInput.trim()}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'pl' ? 'Sprawdzanie tokenu...' : 'Verifying token...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{lang === 'pl' ? 'Zaloguj i Załaduj Kanały' : 'Verify & Load Channels'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: OAuth Popup Method */}
        {activeTab === 'oauth' && (
          <div className="p-5 space-y-4 text-xs">
            <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>
                  {lang === 'pl' ? 'Wymaganie Twitch OAuth Redirect' : 'Twitch OAuth Redirect Requirement'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                {lang === 'pl'
                  ? 'Twitch wymaga, aby adres powrotny (Redirect URL) był dokładnie zarejestrowany w aplikacji na dev.twitch.tv. Jeśli logowanie zwraca błąd "Parameter redirect_uri does not match", użyj metody Tokenu w pierwszej zakładce.'
                  : 'Twitch requires the exact Redirect URL to be whitelisted in your app on dev.twitch.tv. If you get a redirect_uri mismatch, use the Token tab.'}
              </p>
            </div>

            <div className="space-y-2 bg-[#121214] p-3 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Twój aktualny Redirect URL:</span>
                <button
                  type="button"
                  onClick={handleCopyRedirect}
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  {copiedRedirect ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedRedirect ? 'Skopiowano' : 'Kopiuj'}</span>
                </button>
              </div>
              <div className="font-mono text-[11px] text-zinc-300 break-all bg-black/40 p-2 rounded border border-zinc-800 select-all">
                {currentRedirectUri}
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenOAuthPopup}
              className="w-full py-2.5 px-4 bg-[#9146ff] hover:bg-[#772ce8] text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-950"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{lang === 'pl' ? 'Otwórz Okno Logowania Twitch' : 'Open Twitch Login Popup'}</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 bg-[#1f1f23] border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
            <span>
              {lang === 'pl'
                ? 'Dane logowania pozostają wyłącznie w Twojej przeglądarce'
                : 'Your credentials remain strictly local to your browser'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="hover:text-white font-medium transition-colors"
          >
            {lang === 'pl' ? 'Zamknij' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
