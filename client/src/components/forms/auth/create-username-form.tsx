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
import { toast } from 'sonner';



export function CreateUsernameForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {

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
      toast.success(`${username} has a nice ring to it.`, { description: "Welcome to Sway, let's get this party started." })
      navigate("/");
    } catch (err) {
      toast.error("Oops! Something went wrong.", { description: "We were unable to create your username, please try again." })
      setFormError(getApiErrorMessage(err, "Unable to create your username."));
    }
  }

  const usernameMessage =
    usernameIsValid && usernameAvailabilityQuery.isFetching
      ? 'Checking username...'
      : usernameAvailabilityQuery.data?.message;

  return (
    <form
      className={cn('flex flex-col gap-5', className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <Field>
          <Input
              id="username"
              type="text"
              placeholder="aftrhrs"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              minLength={3}
              maxLength={20}
              autoComplete="username"
              aria-describedby="username-requirements"
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 px-4 text-zinc-950 shadow-none placeholder:text-zinc-400 focus-visible:border-zinc-400 focus-visible:ring-zinc-300/30 dark:border-input dark:bg-secondary dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:border-ring dark:focus-visible:ring-ring/50"
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
        <FieldDescription id="username-requirements" className="px-6 text-center text-xs text-zinc-500 dark:text-muted-foreground">
          Usernames must be 3-20 characters long and can only contain letters,
          numbers, and underscores.
        </FieldDescription>
        <Field>
          <Button
            type="submit"
            disabled={createUsernameMutation.isPending}
            className="h-12 rounded-xl bg-black text-base font-semibold text-white shadow-none hover:bg-zinc-800 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
          >
            {createUsernameMutation.isPending ? 'Saving...' : 'Next'}
          </Button>
          <FieldError>{formError}</FieldError>
        </Field>
      </FieldGroup>
    </form>
  );
}
