import { useEffect, useCallback } from 'react';

export interface ShortcutDefinition {
  id: string;
  keyLabel: string;
  category: 'playback' | 'navigation' | 'modals';
  descriptionPl: string;
  descriptionEn: string;
}

export const SHORTCUTS_LIST: ShortcutDefinition[] = [
  {
    id: 'play-pause',
    keyLabel: 'Spacja / Space',
    category: 'playback',
    descriptionPl: 'Wstrzymaj / wznów odtwarzanie (w trybie kinowym lub aktywnym streamie)',
    descriptionEn: 'Pause or resume playback (in theater mode or active stream)',
  },
  {
    id: 'mod-drawer',
    keyLabel: 'M',
    category: 'playback',
    descriptionPl: 'Otwórz / zamknij panel moderatora (Mod View)',
    descriptionEn: 'Toggle moderator drawer (Mod View)',
  },
  {
    id: 'grid-layout',
    keyLabel: 'G (Shift+G)',
    category: 'navigation',
    descriptionPl: 'Przełączaj układy siatki (Auto → 1x1 → 1x2 → 2x2 → 3x2)',
    descriptionEn: 'Cycle through grid layouts (Auto → 1x1 → 1x2 → 2x2 → 3x2)',
  },
  {
    id: 'theater-mode',
    keyLabel: 'T',
    category: 'navigation',
    descriptionPl: 'Włącz / wyłącz tryb kinowy (pełny ekran wybranego streamu)',
    descriptionEn: 'Toggle theater mode (maximize focused stream)',
  },
  {
    id: 'sidebar-toggle',
    keyLabel: 'B  lub  [',
    category: 'navigation',
    descriptionPl: 'Schowaj / pokaż panel boczny',
    descriptionEn: 'Toggle sidebar visibility',
  },
  {
    id: 'stream-index',
    keyLabel: '1 – 9',
    category: 'navigation',
    descriptionPl: 'Szybkie przełączenie w tryb kinowy streamu #1 do #9',
    descriptionEn: 'Quick switch to theater mode for stream #1 through #9',
  },
  {
    id: 'xayo-stats',
    keyLabel: 'X',
    category: 'modals',
    descriptionPl: 'Otwórz / zamknij statystyki xayo.pl i trendy platformy',
    descriptionEn: 'Toggle xayo.pl watch time statistics & platform spikes',
  },
  {
    id: 'settings',
    keyLabel: 'S',
    category: 'modals',
    descriptionPl: 'Otwórz ustawienia aplikacji',
    descriptionEn: 'Open application settings',
  },
  {
    id: 'shortcuts-modal',
    keyLabel: '?  lub  F1',
    category: 'modals',
    descriptionPl: 'Pokaż ściągę skrótów klawiszowych',
    descriptionEn: 'Show keyboard shortcuts cheat sheet',
  },
  {
    id: 'escape',
    keyLabel: 'Esc',
    category: 'modals',
    descriptionPl: 'Zamknij aktywne okno, panel moderatora lub wyjdź z trybu kinowego',
    descriptionEn: 'Close active modal, moderator panel, or exit theater mode',
  },
];

interface UseGlobalKeyboardShortcutsOptions {
  onTogglePlayPause: () => void;
  onToggleModDrawer: () => void;
  onCycleGridMode: (direction?: 'forward' | 'backward') => void;
  onToggleTheater: () => void;
  onToggleSidebar: () => void;
  onToggleXayoModal: () => void;
  onToggleSettings: () => void;
  onToggleShortcutsModal: () => void;
  onEscape: () => void;
  onSelectStreamIndex?: (index: number) => void;
  enabled?: boolean;
}

export function useGlobalKeyboardShortcuts({
  onTogglePlayPause,
  onToggleModDrawer,
  onCycleGridMode,
  onToggleTheater,
  onToggleSidebar,
  onToggleXayoModal,
  onToggleSettings,
  onToggleShortcutsModal,
  onEscape,
  onSelectStreamIndex,
  enabled = true,
}: UseGlobalKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Escape works everywhere to close dialogs or blur inputs
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (isInput) {
          target.blur();
        }
        onEscape();
        return;
      }

      // If user is typing in an input field, do not hijack other keys
      if (isInput) return;

      // Ignore if Ctrl or Meta (Command on Mac) is pressed, to prevent overriding browser shortcuts like Ctrl+S, Ctrl+P, etc.
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Space: Play / Pause in theater mode or active stream
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlayPause();
        return;
      }

      // M: Toggle Moderator Drawer
      if (e.code === 'KeyM') {
        e.preventDefault();
        onToggleModDrawer();
        return;
      }

      // G: Cycle Grid Mode (G forward, Shift+G backward)
      if (e.code === 'KeyG') {
        e.preventDefault();
        onCycleGridMode(e.shiftKey ? 'backward' : 'forward');
        return;
      }

      // T: Toggle Theater Mode
      if (e.code === 'KeyT') {
        e.preventDefault();
        onToggleTheater();
        return;
      }

      // B or [: Toggle Sidebar
      if (e.code === 'KeyB' || e.code === 'BracketLeft') {
        e.preventDefault();
        onToggleSidebar();
        return;
      }

      // X: Toggle Xayo modal
      if (e.code === 'KeyX') {
        e.preventDefault();
        onToggleXayoModal();
        return;
      }

      // S: Toggle Settings modal
      if (e.code === 'KeyS') {
        e.preventDefault();
        onToggleSettings();
        return;
      }

      // ? (Slash with shift) or F1: Show shortcuts help modal
      if (e.key === '?' || e.code === 'F1' || (e.key === '/' && !isInput)) {
        e.preventDefault();
        onToggleShortcutsModal();
        return;
      }

      // Numbers 1 - 9: Quick stream theater selection
      if (onSelectStreamIndex && e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''), 10);
        if (digit >= 1 && digit <= 9) {
          e.preventDefault();
          onSelectStreamIndex(digit - 1);
          return;
        }
      }
    },
    [
      enabled,
      onTogglePlayPause,
      onToggleModDrawer,
      onCycleGridMode,
      onToggleTheater,
      onToggleSidebar,
      onToggleXayoModal,
      onToggleSettings,
      onToggleShortcutsModal,
      onEscape,
      onSelectStreamIndex,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
