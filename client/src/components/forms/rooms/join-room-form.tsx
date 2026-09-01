import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function JoinRoomForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <form>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="roomCode">Room Code</FieldLabel>
            <Input
              id="roomCode"
              type="text"
              placeholder={'e1j2c'.toUpperCase()}
              required
              autoComplete="off"
              maxLength={5}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 px-4 font-mono text-base uppercase tracking-[0.18em] text-zinc-950 shadow-none placeholder:font-sans placeholder:tracking-normal placeholder:text-zinc-400 focus-visible:border-zinc-400 focus-visible:ring-zinc-300/30 dark:border-input dark:bg-secondary dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:border-ring dark:focus-visible:ring-ring/50"
            />
          </Field>
          <Field>
            <Button type="submit" className="h-12 rounded-xl bg-black text-base font-semibold text-white shadow-none transition-colors duration-300 ease-out hover:bg-zinc-800 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">Continue</Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center text-xs leading-5 text-zinc-500 dark:text-muted-foreground">
        By clicking continue, you agree to our{' '}
        <a href="https://www.sway.onl/terms" target="_blank" rel="noreferrer" className="font-medium text-zinc-950 underline underline-offset-4 dark:text-foreground">
          Terms and Conditions
        </a>{' and '}
        <a href="https://www.sway.onl/privacy-policy" target="_blank" rel="noreferrer" className="font-medium text-zinc-950 underline underline-offset-4 dark:text-foreground">
          Privacy Policy
        </a>
        .
      </FieldDescription>
    </div>
  );
}
