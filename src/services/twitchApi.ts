import { TwitchUser, TwitchChannelInfo } from '../types';

const OAUTH_CONFIG_MIGRATION_KEY = 'twitch_oauth_config_v2';

export const DEFAULT_CLIENT_ID = (import.meta.env.VITE_TWITCH_CLIENT_ID || '').trim();

export function purgeLegacyOAuthConfig(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    if (!localStorage.getItem(OAUTH_CONFIG_MIGRATION_KEY)) {
      localStorage.removeItem('twitch_custom_client_id');
      localStorage.removeItem('twitch_token_client_id');
      localStorage.removeItem('twitch_custom_redirect_uri');
      localStorage.setItem(OAUTH_CONFIG_MIGRATION_KEY, '1');
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

if (typeof window !== 'undefined') {
  purgeLegacyOAuthConfig();
}

export function cleanToken(raw: string): string {
  return raw.replace(/^oauth:/i, '').trim();
}

export function getStoredToken(): string | null {
  purgeLegacyOAuthConfig();

  // Check URL hash for OAuth return
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      const cleaned = cleanToken(token);
      localStorage.setItem('twitch_token', cleaned);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      // If opened as an OAuth popup, notify parent window and close popup
      if (window.opener && window.opener !== window) {
        try {
          window.opener.postMessage(
            { type: 'TWITCH_AUTH_TOKEN', token: cleaned },
            window.location.origin
          );
          window.close();
        } catch {
          // Fallback if cross-origin prevents postMessage
        }
      }

      return cleaned;
    }
  }

  const custom = localStorage.getItem('twitch_custom_token');
  if (custom && custom.trim()) return cleanToken(custom);

  const stored = localStorage.getItem('twitch_token');
  return stored ? cleanToken(stored) : null;
}

export function consumeOAuthErrorFromUrl(): { error: string; description: string } | null {
  if (typeof window === 'undefined' || !window.location.search) return null;

  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  if (!error) return null;

  const description = params.get('error_description') || error;
  params.delete('error');
  params.delete('error_description');
  params.delete('state');

  const remaining = params.toString();
  const cleanUrl = window.location.pathname + (remaining ? `?${remaining}` : '') + window.location.hash;
  window.history.replaceState(null, '', cleanUrl);

  if (window.opener && window.opener !== window) {
    try {
      window.opener.postMessage(
        { type: 'TWITCH_AUTH_ERROR', error, errorDescription: description },
        window.location.origin
      );
      window.close();
    } catch {
      // Ignore cross-origin errors
    }
  }

  return { error, description };
}

export function getOAuthClientId(): string {
  purgeLegacyOAuthConfig();

  const custom = localStorage.getItem('twitch_custom_client_id');
  if (custom && custom.trim()) return custom.trim();

  return DEFAULT_CLIENT_ID;
}

export function getEffectiveClientId(): string {
  purgeLegacyOAuthConfig();

  // Priority 1: Client ID associated with the validated token
  const tokenClientId = localStorage.getItem('twitch_token_client_id');
  if (tokenClientId && tokenClientId.trim()) return tokenClientId.trim();

  // Priority 2: User custom configured client ID
  const custom = localStorage.getItem('twitch_custom_client_id');
  if (custom && custom.trim()) return custom.trim();

  // Priority 3: Optional environment-configured Client ID
  return DEFAULT_CLIENT_ID;
}

export function getRedirectUri(): string {
  purgeLegacyOAuthConfig();

  const custom = localStorage.getItem('twitch_custom_redirect_uri');
  if (custom && custom.trim()) return custom.trim();

  return window.location.origin + window.location.pathname;
}

export function buildTwitchAuthUrl(
  clientId = getOAuthClientId(),
  redirectUri = getRedirectUri()
): string {
  const cleanClientId = clientId.trim();
  const cleanRedirectUri = redirectUri.trim();
  if (!cleanClientId) return '';

  const scopes = [
    'user:read:follows',
    'user:read:moderated_channels',
    'user:write:chat',
    'chat:read',
    'chat:edit',
  ].join('%20');

  return `https://id.twitch.tv/oauth2/authorize?client_id=${encodeURIComponent(
    cleanClientId
  )}&redirect_uri=${encodeURIComponent(
    cleanRedirectUri
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
  const sep = endpoint.includes('?') ? '&' : '?';
  const urlWithCacheBuster = `https://api.twitch.tv/helix/${endpoint}${sep}_cb=${Date.now()}`;
  const res = await fetch(urlWithCacheBuster, {
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
  clientId = getEffectiveClientId(),
  maxPages = 5 // Fetches up to 500 followed channels with cursor pagination
): Promise<TwitchChannelInfo[]> {
  const allChannels: TwitchChannelInfo[] = [];
  let cursor: string | undefined = undefined;

  try {
    for (let page = 0; page < maxPages; page++) {
      const cursorParam = cursor ? `&after=${encodeURIComponent(cursor)}` : '';
      const data: any = await fetchHelix(
        `channels/followed?user_id=${userId}&first=100${cursorParam}`,
        token,
        clientId
      );

      const items = (data?.data || []).map((ch: any) => ({
        broadcaster_id: ch.broadcaster_id,
        broadcaster_login: ch.broadcaster_login,
        broadcaster_name: ch.broadcaster_name,
        followed_at: ch.followed_at,
        is_moderator: false,
      }));

      allChannels.push(...items);

      cursor = data?.pagination?.cursor;
      if (!cursor || items.length < 100) {
        break;
      }
    }
    return allChannels;
  } catch (err) {
    console.warn('Could not fetch followed channels', err);
    return allChannels;
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

/**
 * Directly queries Twitch for all followed streams that are currently LIVE.
 * Requires user:read:follows scope (already granted).
 */
export async function getFollowedLiveStreams(
  userId: string,
  token: string,
  clientId = getEffectiveClientId()
): Promise<Record<string, LiveStreamData>> {
  const map: Record<string, LiveStreamData> = {};
  let cursor: string | undefined = undefined;

  try {
    for (let page = 0; page < 3; page++) {
      const cursorParam = cursor ? `&after=${encodeURIComponent(cursor)}` : '';
      const data: any = await fetchHelix(
        `streams/followed?user_id=${userId}&first=100${cursorParam}`,
        token,
        clientId
      );

      (data?.data || []).forEach((stream: any) => {
        if (stream.user_login) {
          map[stream.user_login.toLowerCase().trim()] = stream;
        }
      });

      cursor = data?.pagination?.cursor;
      if (!cursor || !data?.data?.length || data.data.length < 100) {
        break;
      }
    }
    return map;
  } catch (err) {
    console.warn('Could not fetch followed live streams', err);
    return map;
  }
}

export const TWITCH_PUBLIC_GQL_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

/**
 * Fallback real-time stream status resolver via Twitch's GQL service.
 * Bypasses Helix edge CDN caching, replication lag, and works even without OAuth tokens.
 * Accurately detects active streams (like 'domciafk') when Helix returns stale offline results.
 */
export async function getLiveStreamsGQL(
  logins: string[]
): Promise<Record<string, LiveStreamData>> {
  if (!logins.length) return {};
  const cleanLogins = Array.from(
    new Set(logins.map((l) => l.toLowerCase().trim()).filter(Boolean))
  );
  if (!cleanLogins.length) return {};

  const chunks: string[][] = [];
  for (let i = 0; i < cleanLogins.length; i += 70) {
    chunks.push(cleanLogins.slice(i, i + 70));
  }

  const map: Record<string, LiveStreamData> = {};

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const query = `query GetLiveUsers { users(logins: ${JSON.stringify(chunk)}) { id login displayName stream { id title viewersCount game { name } createdAt previewImageURL(width: 320, height: 180) } } }`;

        const res = await fetch('https://gql.twitch.tv/gql', {
          method: 'POST',
          headers: {
            'Client-Id': TWITCH_PUBLIC_GQL_CLIENT_ID,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        if (!res.ok) return;
        const data = await res.json();
        const users = data?.data?.users;
        if (Array.isArray(users)) {
          users.forEach((u: any) => {
            const login = u?.login?.toLowerCase().trim();
            if (login && u.stream) {
              map[login] = {
                user_login: login,
                user_name: u.displayName || u.login,
                game_name: u.stream.game?.name || '',
                title: u.stream.title || '',
                viewer_count: u.stream.viewersCount || 0,
                thumbnail_url:
                  u.stream.previewImageURL ||
                  `https://static-cdn.jtvnw.net/previews-ttv/live_user_${login}-320x180.jpg`,
                started_at: u.stream.createdAt || new Date().toISOString(),
              };
            }
          });
        }
      } catch (err) {
        console.warn('GQL live stream lookup fallback error', err);
      }
    })
  );

  return map;
}

/**
 * Queries Twitch for live streams with an automatic fallback & cache-refresh mechanism:
 * 1. Queries Twitch Helix streams API in parallel batches with cache-busting headers.
 * 2. If token is missing, or if channels are still reported offline (e.g. 'domciafk' due to Helix edge lag),
 *    queries Twitch's real-time GQL endpoint to bypass stale edge cache.
 * 3. Merges the results so active live streams are never missed.
 */
export async function getLiveStreams(
  logins: string[],
  token?: string | null,
  clientId = getEffectiveClientId()
): Promise<Record<string, LiveStreamData>> {
  if (!logins.length) return {};
  const cleanLogins = Array.from(
    new Set(logins.map((l) => l.toLowerCase().trim()).filter(Boolean))
  );
  if (!cleanLogins.length) return {};

  const resultMap: Record<string, LiveStreamData> = {};

  // Tier 1: If OAuth token exists, query Helix streams with cache-busting
  if (token) {
    const chunks: string[][] = [];
    for (let i = 0; i < cleanLogins.length; i += 100) {
      chunks.push(cleanLogins.slice(i, i + 100));
    }

    await Promise.all(
      chunks.map(async (chunk) => {
        const query = chunk.map((l) => `user_login=${encodeURIComponent(l)}`).join('&');
        try {
          const data = await fetchHelix<{ data: LiveStreamData[] }>(
            `streams?${query}&first=100`,
            token,
            clientId
          );
          (data.data || []).forEach((stream) => {
            if (stream.user_login) {
              resultMap[stream.user_login.toLowerCase().trim()] = stream;
            }
          });
        } catch (err) {
          console.warn('Failed to query live stream batch from Helix', err);
        }
      })
    );
  }

  // Tier 2: Real-time fallback & cache-refresh check for any channels reported as offline / missing
  // Channels like 'domciafk' often experience Helix edge CDN caching delay.
  const offlineOrMissing = cleanLogins.filter((login) => !resultMap[login]);

  if (offlineOrMissing.length > 0) {
    try {
      const gqlResults = await getLiveStreamsGQL(offlineOrMissing);
      // Merge GQL results into resultMap (GQL overrides offline status with real-time stream data)
      Object.assign(resultMap, gqlResults);
    } catch (gqlErr) {
      console.warn('Fallback GQL check error', gqlErr);
    }
  }

  return resultMap;
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
