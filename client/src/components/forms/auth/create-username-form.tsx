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
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href="https://www.sway.onl"
              className="flex flex-col items-center gap-2 font-black tracking-tighter"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                {/* <svg
                  width="42"
                  height="42"
                  viewBox="0 0 42 42"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clip-path="url(#clip0_47_23)">
                    <path
                      d="M20.7724 21.7681V21.2276H20.2319H6.17781V20.2095C13.0744 18.5019 18.5019 13.0744 20.2095 6.17781H21.2276V20.2319V20.7724H21.7681H35.8222V21.7905C28.9256 23.4981 23.4981 28.9256 21.7905 35.8222H20.7724V21.7681ZM1.54054 15.5946H1V16.1351V25.8649V26.4054H1.54054H15.5946V40.4595V41H16.1351H25.8649H26.4054V40.4595C26.4054 32.6977 32.6977 26.4054 40.4595 26.4054H41V25.8649V16.1351V15.5946H40.4595H26.4054V1.54054V1H25.8649H16.1351H15.5946V1.54054C15.5946 9.30232 9.30232 15.5946 1.54054 15.5946Z"
                      fill="#2A4596"
                      stroke="#2A4596"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_47_23">
                      <rect width="42" height="42" fill="white" />
                    </clipPath>
                  </defs>
                </svg> */}
              </div>
              <span className="sr-only">Sway</span>
            </a>
            <h1 className="text-xl font-bold tracking-tight">
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
              placeholder="aftrhrs"
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
