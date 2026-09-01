import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { getApiErrorMessage } from '@/api/client';
import { useLoginMutation } from '@/api/auth';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const loginMutation = useLoginMutation();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    try {
      const { user } = await loginMutation.mutateAsync({ identifier, password });
      toast.success(`Welcome back ${user.username}!`, { description: "You're signed in and ready to manage your rooms." })
      navigate(user.hasUsername ? "/dashboard" : "/username");
    } catch (error) {
      toast.error("Oops! Something went wrong.", { description: "We were unable to log you in, please try again." })
      setFormError(getApiErrorMessage(error, "Unable to log you in."));
    }
  }

  return (
    <form
      className={cn('flex flex-col gap-5', className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        {/* identifier */}
        <Field>
          <FieldLabel htmlFor="identifier">Username or Email</FieldLabel>
          <Input
            id="identifier"
            type="text"
            placeholder="johndoe"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value.toLowerCase())}
            className="h-12 rounded-xl border-zinc-200 bg-zinc-50 px-4 text-zinc-950 shadow-none placeholder:text-zinc-400 focus-visible:border-zinc-400 focus-visible:ring-zinc-300/30 dark:border-input dark:bg-secondary dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:border-ring dark:focus-visible:ring-ring/50"
          />
        </Field>

        {/* password */}
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border-zinc-200 bg-zinc-50 px-4 text-zinc-950 shadow-none placeholder:text-zinc-400 focus-visible:border-zinc-400 focus-visible:ring-zinc-300/30 dark:border-input dark:bg-secondary dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:border-ring dark:focus-visible:ring-ring/50"
          />
        </Field>

        {/* submit button */}
        <Field>
          <Button type="submit" disabled={loginMutation.isPending} className="h-12 rounded-xl bg-black text-base font-semibold text-white shadow-none hover:bg-zinc-800 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
            {loginMutation.isPending ? 'Logging in...' : 'Login'}
          </Button>
          <FieldError>{formError}</FieldError>
        </Field>
        <Field>
          <FieldDescription className="text-center text-sm text-zinc-500 dark:text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-semibold text-zinc-950 underline underline-offset-4 dark:text-foreground">
              Sign up
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
