import { GalleryVerticalEnd } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/api/client';
import {
  useCreateUsernameMutation,
  useUsernameAvailabilityQuery,
} from '@/api/auth';
import { useDebouncedValue } from '@/hooks/use-debounced-value';



export function CreateUsernameForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {

  const [username, setUsername] = useState("");
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();
  const createUsernameMutation = useCreateUsernameMutation();
  const debouncedUsername = useDebouncedValue(username);
  const usernameIsValid = /^[a-zA-Z0-9_]{3,20}$/.test(debouncedUsername);
  const usernameAvailabilityQuery = useUsernameAvailabilityQuery(
    usernameIsValid ? debouncedUsername : ''
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setFormError("Username must be 3-20 characters and can only contain letters, numbers, and underscores.");
      return;
    }

    if (usernameAvailabilityQuery.data?.taken) {
      setFormError("Username is already in use.");
      return;
    }

    try {
      await createUsernameMutation.mutateAsync({ username });
      navigate("/");
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Unable to create your username."));
    }
  }

  const usernameMessage =
    usernameIsValid && usernameAvailabilityQuery.isFetching
      ? 'Checking username...'
      : usernameAvailabilityQuery.data?.message;

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Acme Inc.</span>
            </a>
            <h1 className="text-xl font-bold">
              You're in. Let's pick your handle.
            </h1>
            <FieldDescription className="text-center">
              Your username acts as your public profile link. Use it to share
              your live request queues with clients and guests.
            </FieldDescription>
          </div>
          <Field>
            <Input
              id="username"
              type="text"
              placeholder="jazzyjeff"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              minLength={3}
              maxLength={20}
              autoComplete="username"
            />
            {usernameMessage ? (
              <FieldDescription
                className={cn(
                  'text-xs',
                  usernameAvailabilityQuery.data?.taken && 'text-destructive'
                )}
              >
                {usernameMessage}
              </FieldDescription>
            ) : null}
          </Field>
          <FieldDescription className="px-6 text-center text-xs">
            Usernames must be 3-20 characters long and can only contain letters,
            numbers, and underscores.
          </FieldDescription>
          <Field>
            <Button type="submit" disabled={createUsernameMutation.isPending}>
              {createUsernameMutation.isPending ? 'Saving...' : 'Next'}
            </Button>
            <FieldError>{formError}</FieldError>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
