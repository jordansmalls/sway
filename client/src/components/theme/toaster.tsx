import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            '!bg-secondary border-2 !border-primary/40 shadow-lg !text-primary dark:!text-white tracking-tight font-semibold',
          description: '!text-primary/90 dark:!text-white/90 tracking-tight',
        },
      }}
    />
  );
}
