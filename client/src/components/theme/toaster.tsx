import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            '!bg-secondary border-2 !border-primary/40 shadow-lg !text-primary dark:!text-white',
          description: '!text-primary/80 dark:!text-white/70',
        },
      }}
    />
  );
}
