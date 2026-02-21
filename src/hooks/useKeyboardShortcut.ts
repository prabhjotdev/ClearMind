import { useEffect, useCallback } from 'react';

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Registers a global keydown shortcut.
 *
 * The callback is NOT fired when:
 *  - `enabled` is false
 *  - The user is currently focused on an input / textarea / select
 *  - A modifier key (Ctrl, Meta, Alt) is held (unless `allowModifiers` is true)
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  enabled: boolean,
  options: { allowModifiers?: boolean } = {}
) {
  const stableCallback = useCallback(callback, [callback]);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (!options.allowModifiers && (e.ctrlKey || e.metaKey || e.altKey)) return;
      const target = e.target as Element;
      if (INPUT_TAGS.has(target.tagName)) return;
      if ((target as HTMLElement).isContentEditable) return;

      if (e.key === key) {
        e.preventDefault();
        stableCallback();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, stableCallback, enabled, options.allowModifiers]);
}
