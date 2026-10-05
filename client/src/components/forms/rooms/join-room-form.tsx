import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJoinRoomMutation } from '@/api/rooms';
import { getApiErrorMessage } from '@/api/client';

export function JoinRoomForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const joinRoom = useJoinRoomMutation();
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (joinRoom.isPending) return;

    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError('Enter a room code.');
      return;
    }

    setError('');
    joinRoom.mutate({ roomCode: code }, {
      onSuccess: (data) => {
        navigate(`/room/${encodeURIComponent(data.roomDetails.roomCode)}`);
      },
      onError: (error) => {
        setError(getApiErrorMessage(error, 'Unable to join this room. Please try again.'));
      },
    });
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="roomCode">Room Code</FieldLabel>
            <Input
              id="roomCode"
              name="roomCode"
              type="text"
              value={roomCode}
              onChange={(event) => {
                setRoomCode(event.target.value);
                setError('');
              }}
              disabled={joinRoom.isPending}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'join-room-error' : undefined}
              placeholder={'e1j2c'.toUpperCase()}
              required
              autoComplete="off"
              maxLength={5}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 px-4 font-mono text-base uppercase tracking-[0.02em] text-zinc-950 shadow-none placeholder:font-sans placeholder:tracking-normal placeholder:text-zinc-400 focus-visible:border-zinc-400 focus-visible:ring-zinc-300/30 dark:border-input dark:bg-secondary dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:border-ring dark:focus-visible:ring-ring/50"
            />
            {error ? <p id="join-room-error" role="alert" className="text-sm text-destructive">{error}</p> : null}
          </Field>
          <Field>
            <Button type="submit" disabled={joinRoom.isPending} className="h-12 rounded-xl bg-black text-base font-semibold text-white shadow-none transition-colors duration-300 ease-out hover:bg-zinc-800 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">{joinRoom.isPending ? 'Joining...' : 'Continue'}</Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center text-[.8rem] leading-5 text-white/50 dark:text-muted-foreground">
        By clicking continue, you agree to our{' '}
        <a href="https://www.sway.onl/terms" target="_blank" rel="noreferrer" className="font-medium text-zinc-950 underline underline-offset-4 dark:text-foreground">
         Terms
        </a>.
      </FieldDescription>
    </div>
  );
}
