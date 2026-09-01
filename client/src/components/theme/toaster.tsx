import { Toaster as SonnerToaster } from 'sonner';

import { useTheme } from './theme-provider';
import { useToastPosition } from '@/hooks/use-toast-position';

export function Toaster() {
  const { theme } = useTheme();
  const { position } = useToastPosition();

  return (
    <SonnerToaster
      position={position}
      theme={theme}
    />
  );
}
