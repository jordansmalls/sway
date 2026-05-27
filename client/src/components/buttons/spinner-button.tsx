import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Spinner } from '../ui/spinner';

interface SpinnerButtonProps extends React.ComponentProps<typeof Button> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function SpinnerButton({
  isLoading,
  loadingText = 'Please wait',
  children,
  className,
  ...props
}: SpinnerButtonProps) {
  return (
    <Button
      disabled={props.disabled || isLoading}
      className={cn('flex items-center justify-center gap-2', className)}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner className="h-4 w-4" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
