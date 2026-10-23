import { useEffect, useState } from 'react';
import type { Appearance } from './preferences';
import { readAppearance, saveAppearance } from './preferences';

export function useAppearance() {
  const [initial] = useState(readAppearance);
  const [appearance, setAppearance] = useState<Appearance>(initial.ok ? initial.value : 'system');

  const [storageAvailable, setStorageAvailable] = useState(initial.ok);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const systemTheme = media.matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = appearance === 'system' ? systemTheme : appearance;
    };
    apply();
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
    };
  }, [appearance]);

  const selectAppearance = (next: Appearance) => {
    setAppearance(next);
    const result = saveAppearance(next);
    setStorageAvailable(result.ok);
  };

  return { appearance, selectAppearance, storageAvailable };
}
