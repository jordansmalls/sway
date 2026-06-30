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
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href="https://www.sway.onl"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md font-black tracking-tighter">
                Sway
              </div>
              <span className="sr-only">Sway</span>
            </a>
            <h1 className="text-xl font-bold">Let's Get This Party Started.</h1>
            <FieldDescription className="text-center">
              Enter the code to room you wish to join, and get to the party!
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="roomCode">Room Code</FieldLabel>
            <Input
              id="roomCode"
              type="text"
              placeholder={'e1j2c'.toUpperCase()}
              required
            />
          </Field>
          <Field>
            <Button type="submit">Continue</Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{' '}
        <a href="https://www.sway.onl/terms" target="_blank">
          Terms and Conditions
        </a>{' '}
        <a href="https://www.sway.onl/privacy-policy" target="_blank">
          Privacy Policy
        </a>
        .
      </FieldDescription>
    </div>
  );
}
