import { useEffect, useState } from 'react';
import type { ToasterProps } from 'sonner';

export type ToastPosition = NonNullable<ToasterProps['position']>;

const STORAGE_KEY = 'sway-toast-position';
const CHANGE_EVENT = 'sway-toast-position-change';
const DEFAULT_POSITION: ToastPosition = 'bottom-right';

const positions: ToastPosition[] = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];

function readPosition(): ToastPosition {
  const stored = localStorage.getItem(STORAGE_KEY);
  return positions.includes(stored as ToastPosition) ? stored as ToastPosition : DEFAULT_POSITION;
}

export function useToastPosition() {
  const [position, setPositionState] = useState<ToastPosition>(readPosition);

  useEffect(() => {
    const sync = () => setPositionState(readPosition());
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  function setPosition(next: ToastPosition) {
    localStorage.setItem(STORAGE_KEY, next);
    setPositionState(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { position, setPosition };
}
