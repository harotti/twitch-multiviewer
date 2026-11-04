import { useState, useEffect, useRef } from 'react';
import { ChannelWatchStat } from '../types';

export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

export function formatTimeFull(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || hours > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
}

const STORAGE_KEY = 'twitchWatchTimes';
const DETAILED_STORAGE_KEY = 'twitchWatchTimes_detailed_v2';

export function useWatchTimeTracker(activeChannels: string[]) {
  const [stats, setStats] = useState<Record<string, ChannelWatchStat>>(() => {
    try {
      const detailed = localStorage.getItem(DETAILED_STORAGE_KEY);
      if (detailed) {
        return JSON.parse(detailed);
      }
      // Migrate legacy minute-based data
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) {
        const legacyParsed = JSON.parse(legacy) as Record<string, number>;
        const migrated: Record<string, ChannelWatchStat> = {};
        for (const [ch, mins] of Object.entries(legacyParsed)) {
          migrated[ch.toLowerCase()] = {
            channel: ch.toLowerCase(),
            totalSeconds: (mins || 0) * 60,
            sessionSeconds: 0,
            firstSeen: Date.now(),
            lastWatched: Date.now(),
          };
        }
        return migrated;
      }
    } catch (e) {
      console.error('Failed to load watch time from localStorage', e);
    }
    return {};
  });

  const sessionTimersRef = useRef<Record<string, number>>({});
  const activeChannelsRef = useRef(activeChannels);

  useEffect(() => {
    activeChannelsRef.current = activeChannels;
  }, [activeChannels]);

  // Tick every second to give smooth live counters for active channels
  useEffect(() => {
    const interval = setInterval(() => {
      const channels = activeChannelsRef.current;
      if (channels.length === 0) return;

      const now = Date.now();
      setStats((prev) => {
        let changed = false;
        const next = { ...prev };

        channels.forEach((chRaw) => {
          const ch = chRaw.toLowerCase();
          const current = next[ch] || {
            channel: ch,
            totalSeconds: 0,
            sessionSeconds: 0,
            firstSeen: now,
            lastWatched: now,
          };

          next[ch] = {
            ...current,
            totalSeconds: current.totalSeconds + 1,
            sessionSeconds: current.sessionSeconds + 1,
            lastWatched: now,
          };
          changed = true;
        });

        if (changed) {
          // Sync with local storage
          try {
            localStorage.setItem(DETAILED_STORAGE_KEY, JSON.stringify(next));

            // Also keep legacy minutes format updated for compatibility
            const legacySync: Record<string, number> = {};
            Object.values(next).forEach((s) => {
              legacySync[s.channel] = Math.floor(s.totalSeconds / 60);
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(legacySync));
          } catch (e) {
            console.error('Failed to sync watch times to localStorage', e);
          }
          return next;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const resetAllStats = () => {
    setStats({});
    localStorage.removeItem(DETAILED_STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  };

  const resetChannelStat = (channel: string) => {
    const ch = channel.toLowerCase();
    setStats((prev) => {
      const next = { ...prev };
      delete next[ch];
      localStorage.setItem(DETAILED_STORAGE_KEY, JSON.stringify(next));
      const legacySync: Record<string, number> = {};
      Object.values(next).forEach((s) => {
        legacySync[s.channel] = Math.floor(s.totalSeconds / 60);
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacySync));
      return next;
    });
  };

  const totalWatchSeconds = Object.values(stats).reduce((acc, curr) => acc + curr.totalSeconds, 0);
  const totalSessionSeconds = Object.values(stats).reduce((acc, curr) => acc + curr.sessionSeconds, 0);

  return {
    stats,
    totalWatchSeconds,
    totalSessionSeconds,
    resetAllStats,
    resetChannelStat,
  };
}
