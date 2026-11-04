import { XayoWatchtimeEntry, XayoPeriod } from '../types';

export async function fetchXayoWatchtime(
  username: string,
  period: XayoPeriod = 'all',
  platform: 'twitch' | 'kick' = 'twitch'
): Promise<XayoWatchtimeEntry[]> {
  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername) {
    return [];
  }

  const url = `https://xayo.pl/api/chatters/${encodeURIComponent(
    cleanUsername
  )}/watchtime?platform=${platform}&period=${period}`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Nie znaleziono użytkownika "${cleanUsername}" w bazie xayo.pl`);
    }
    throw new Error(`Błąd xayo.pl API (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return data;
}

export function formatMinutes(minutes: number, lang: 'pl' | 'en' = 'pl'): {
  formatted: string;
  daysSubtitle?: string;
  totalHours: number;
} {
  const totalHours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const days = Math.floor(totalHours / 24);

  let formatted = '';
  if (totalHours === 0) {
    formatted = `${remainingMinutes}m`;
  } else if (remainingMinutes === 0) {
    formatted = `${totalHours}h`;
  } else {
    formatted = `${totalHours}h ${remainingMinutes}m`;
  }

  let daysSubtitle: string | undefined;
  if (days >= 1) {
    daysSubtitle = lang === 'pl' ? `~${days} ${days === 1 ? 'dzień' : 'dni'} ciągłego oglądania` : `~${days} ${days === 1 ? 'day' : 'days'} continuous`;
  }

  return {
    formatted,
    daysSubtitle,
    totalHours,
  };
}

export function formatFollowedDate(
  followedAt?: string,
  lang: 'pl' | 'en' = 'pl'
): {
  dateFormatted: string;
  durationText: string;
  daysAgo: number;
} | null {
  if (!followedAt) return null;

  try {
    const followDate = new Date(followedAt);
    if (isNaN(followDate.getTime())) return null;

    const now = new Date();
    const diffMs = now.getTime() - followDate.getTime();
    const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const monthsAgo = Math.floor(daysAgo / 30.4375);
    const yearsAgo = Math.floor(daysAgo / 365.25);

    let durationText = '';
    if (lang === 'pl') {
      if (yearsAgo >= 1) {
        const remMonths = monthsAgo % 12;
        durationText = remMonths > 0
          ? `${yearsAgo} ${yearsAgo === 1 ? 'rok' : yearsAgo < 5 ? 'lata' : 'lat'} ${remMonths} mies.`
          : `${yearsAgo} ${yearsAgo === 1 ? 'rok' : yearsAgo < 5 ? 'lata' : 'lat'}`;
      } else if (monthsAgo >= 1) {
        durationText = `${monthsAgo} ${monthsAgo === 1 ? 'miesiąc' : monthsAgo < 5 ? 'miesiące' : 'miesięcy'}`;
      } else {
        durationText = `${daysAgo} ${daysAgo === 1 ? 'dzień' : 'dni'}`;
      }
    } else {
      if (yearsAgo >= 1) {
        durationText = `${yearsAgo}y ${monthsAgo % 12}m`;
      } else if (monthsAgo >= 1) {
        durationText = `${monthsAgo} ${monthsAgo === 1 ? 'month' : 'months'}`;
      } else {
        durationText = `${daysAgo} ${daysAgo === 1 ? 'day' : 'days'}`;
      }
    }

    const dateFormatted = followDate.toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return {
      dateFormatted,
      durationText,
      daysAgo,
    };
  } catch {
    return null;
  }
}

export function formatRelativeLastSeen(
  lastSeenStr?: string,
  lang: 'pl' | 'en' = 'pl'
): string {
  if (!lastSeenStr) return lang === 'pl' ? 'brak danych' : 'no data';

  try {
    // xayo format e.g. "2026-10-31 05:11:38.738" or ISO
    const normalized = lastSeenStr.replace(' ', 'T');
    const seenDate = new Date(normalized);
    if (isNaN(seenDate.getTime())) return lastSeenStr;

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - seenDate.getTime()) / 1000);

    if (diffSec < 60) return lang === 'pl' ? 'przed chwilą' : 'just now';
    const diffMins = Math.floor(diffSec / 60);
    if (diffMins < 60) {
      return lang === 'pl' ? `${diffMins} min temu` : `${diffMins}m ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return lang === 'pl' ? `${diffHours} godz. temu` : `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return lang === 'pl' ? 'wczoraj' : 'yesterday';
    if (diffDays < 30) {
      return lang === 'pl' ? `${diffDays} dni temu` : `${diffDays}d ago`;
    }
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return lang === 'pl' ? `${diffMonths} mies. temu` : `${diffMonths}mo ago`;
    }
    const diffYears = Math.floor(diffDays / 365);
    return lang === 'pl' ? `${diffYears} lat temu` : `${diffYears}y ago`;
  } catch {
    return lastSeenStr;
  }
}
