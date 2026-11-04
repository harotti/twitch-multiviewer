export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  description?: string;
}

export interface TwitchChannelInfo {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  followed_at?: string;
  is_moderator?: boolean;
  game_name?: string;
  title?: string;
  viewer_count?: number;
  is_live?: boolean;
  thumbnail_url?: string;
}

export interface ChannelWatchStat {
  channel: string;
  totalSeconds: number;
  sessionSeconds: number;
  firstSeen: number;
  lastWatched: number;
}

export interface XayoWatchtimeEntry {
  streamerName: string;
  avatarUrl: string;
  minutes: number;
  lastSeen: string;
}

export type XayoPeriod = 'all' | '365d' | '30d';

export type GridMode = 'auto' | '1x1' | '1x2' | '2x2' | '3x2' | 'theater';

export interface StreamPreset {
  id: string;
  name: string;
  channels: string[];
  createdAt: number;
}

export interface AppSettings {
  clientId: string;
  redirectUri: string;
  customToken: string;
  autoMuteNewStreams: boolean;
  preferredQuality: string;
  language: 'pl' | 'en';
}
