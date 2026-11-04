import { TwitchUser, TwitchChannelInfo } from '../types';

export const DEFAULT_CLIENT_ID = 'vch0e4gq78sqrbnfvy3zs2yb2mw5jy';
export const NETLIFY_REDIRECT_URI = 'https://celadon-kashata-4427d5.netlify.app/';

export function cleanToken(raw: string): string {
  return raw.replace(/^oauth:/i, '').trim();
}

export function getStoredToken(): string | null {
  // Check URL hash for OAuth return
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      const cleaned = cleanToken(token);
      localStorage.setItem('twitch_token', cleaned);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return cleaned;
    }
  }

  const custom = localStorage.getItem('twitch_custom_token');
  if (custom && custom.trim()) return cleanToken(custom);

  const stored = localStorage.getItem('twitch_token');
  return stored ? cleanToken(stored) : null;
}

export function getEffectiveClientId(): string {
  // Priority 1: Client ID associated with the validated token
  const tokenClientId = localStorage.getItem('twitch_token_client_id');
  if (tokenClientId && tokenClientId.trim()) return tokenClientId.trim();

  // Priority 2: User custom configured client ID
  const custom = localStorage.getItem('twitch_custom_client_id');
  if (custom && custom.trim()) return custom.trim();

  // Priority 3: Default client ID from initial project
  return DEFAULT_CLIENT_ID;
}

export function getRedirectUri(): string {
  const custom = localStorage.getItem('twitch_custom_redirect_uri');
  if (custom && custom.trim()) return custom.trim();
  // If user hasn't overridden and is using default Client ID, default to registered Netlify or current origin
  return window.location.origin + window.location.pathname;
}

export function buildTwitchAuthUrl(
  clientId = getEffectiveClientId(),
  redirectUri = getRedirectUri()
): string {
  const scopes = [
    'user:read:follows',
    'user:read:moderated_channels',
  ].join('%20');

  return `https://id.twitch.tv/oauth2/authorize?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=token&scope=${scopes}&force_verify=true`;
}

export interface TokenValidationResult {
  valid: boolean;
  clientId?: string;
  userId?: string;
  login?: string;
  scopes?: string[];
  expiresIn?: number;
  error?: string;
}

export async function validateTwitchToken(rawToken: string): Promise<TokenValidationResult> {
  const token = cleanToken(rawToken);
  if (!token) {
    return { valid: false, error: 'Token nie może być pusty.' };
  }

  try {
    const res = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        Authorization: `OAuth ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { valid: false, error: 'Token jest nieprawidłowy lub wygasł (401 Unauthorized).' };
      }
      return { valid: false, error: `Błąd weryfikacji tokenu (${res.status}): ${res.statusText}` };
    }

    const data = await res.json();

    // Cache the matching client_id that issued this token
    if (data.client_id) {
      localStorage.setItem('twitch_token_client_id', data.client_id);
    }

    return {
      valid: true,
      clientId: data.client_id,
      userId: data.user_id,
      login: data.login,
      scopes: data.scopes,
      expiresIn: data.expires_in,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message || 'Nie udało się połączyć z serwerem autoryzacji Twitch.',
    };
  }
}

export async function fetchHelix<T>(
  endpoint: string,
  token: string,
  clientId = getEffectiveClientId()
): Promise<T> {
  const cleaned = cleanToken(token);
  const res = await fetch(`https://api.twitch.tv/helix/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${cleaned}`,
      'Client-Id': clientId,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('twitch_token');
    localStorage.removeItem('twitch_token_client_id');
    throw new Error('Token wygasł lub jest nieprawidłowy (401 Unauthorized)');
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Błąd Twitch API (${res.status}): ${errorText || res.statusText}`);
  }

  return res.json();
}

export async function getCurrentUser(
  token: string,
  clientId = getEffectiveClientId()
): Promise<TwitchUser | null> {
  const data = await fetchHelix<{ data: TwitchUser[] }>('users', token, clientId);
  return data.data?.[0] || null;
}

export async function getModeratedChannels(
  userId: string,
  token: string,
  clientId = getEffectiveClientId()
): Promise<TwitchChannelInfo[]> {
  try {
    const data = await fetchHelix<{
      data: Array<{ broadcaster_id: string; broadcaster_login: string; broadcaster_name: string }>;
    }>(`moderation/channels?user_id=${userId}&first=100`, token, clientId);

    return (data.data || []).map((ch) => ({
      broadcaster_id: ch.broadcaster_id,
      broadcaster_login: ch.broadcaster_login,
      broadcaster_name: ch.broadcaster_name,
      is_moderator: true,
    }));
  } catch (err) {
    try {
      const dataFallback = await fetchHelix<{
        data: Array<{ broadcaster_id: string; broadcaster_login: string; broadcaster_name: string }>;
      }>(`moderation/channels?broadcaster_id=${userId}&first=100`, token, clientId);

      return (dataFallback.data || []).map((ch) => ({
        broadcaster_id: ch.broadcaster_id,
        broadcaster_login: ch.broadcaster_login,
        broadcaster_name: ch.broadcaster_name,
        is_moderator: true,
      }));
    } catch {
      console.warn('Could not fetch moderated channels', err);
      return [];
    }
  }
}

export async function getFollowedChannels(
  userId: string,
  token: string,
  clientId = getEffectiveClientId()
): Promise<TwitchChannelInfo[]> {
  try {
    const data = await fetchHelix<{
      data: Array<{
        broadcaster_id: string;
        broadcaster_login: string;
        broadcaster_name: string;
        followed_at?: string;
      }>;
    }>(`channels/followed?user_id=${userId}&first=100`, token, clientId);

    return (data.data || []).map((ch) => ({
      broadcaster_id: ch.broadcaster_id,
      broadcaster_login: ch.broadcaster_login,
      broadcaster_name: ch.broadcaster_name,
      followed_at: ch.followed_at,
      is_moderator: false,
    }));
  } catch (err) {
    console.warn('Could not fetch followed channels', err);
    return [];
  }
}

export interface LiveStreamData {
  user_login: string;
  user_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
  thumbnail_url: string;
  started_at: string;
}

export async function getLiveStreams(
  logins: string[],
  token: string,
  clientId = getEffectiveClientId()
): Promise<Record<string, LiveStreamData>> {
  if (!logins.length) return {};
  const query = logins.map((l) => `user_login=${encodeURIComponent(l.toLowerCase())}`).join('&');
  try {
    const data = await fetchHelix<{ data: LiveStreamData[] }>(
      `streams?${query}&first=100`,
      token,
      clientId
    );
    const map: Record<string, LiveStreamData> = {};
    (data.data || []).forEach((stream) => {
      map[stream.user_login.toLowerCase()] = stream;
    });
    return map;
  } catch (err) {
    console.warn('Failed to query live stream status', err);
    return {};
  }
}

export function openTwitchModView(channel: string): void {
  const clean = channel.trim().toLowerCase();
  if (!clean) return;
  const url = `https://www.twitch.tv/moderator/${encodeURIComponent(clean)}`;
  const width = 1200;
  const height = 800;
  const left = Math.max(0, Math.floor((window.screen.width - width) / 2));
  const top = Math.max(0, Math.floor((window.screen.height - height) / 2));

  try {
    const win = window.open(
      url,
      `twitch_mod_${clean}`,
      `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no,resizable=yes,scrollbars=yes`
    );
    if (!win) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
