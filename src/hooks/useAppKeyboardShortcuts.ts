import { useEffect } from 'react';
import { useNoteStore } from '@/store/noteStore';
import { useUIStore } from '@/store/uiStore';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';

function isFormFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA';
}

export function useAppKeyboardShortcuts() {
  const layout = useAdaptiveLayout();

  useEffect(() => {
    if (layout !== 'desktop') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key !== 'n' && key !== 'f') return;

      const { currentScreen, openNoteSearch } = useUIStore.getState();
      if (currentScreen === 'settings') return;

      if (key === 'n') {
        if (isFormFieldTarget(e.target)) return;
        e.preventDefault();
        void useNoteStore.getState().createNote();
        return;
      }

      if (key === 'f') {
        e.preventDefault();
        openNoteSearch();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [layout]);
}
