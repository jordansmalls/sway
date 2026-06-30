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
      toast.success(`Welome back ${user.username}!`, { description: "Let's get back to it." })
      navigate(user.hasUsername ? "/dashboard" : "/username");
    } catch (error) {
      toast.error("Oops! Something went wrong.", { description: "We were unable to log you in, please try again." })
      setFormError(getApiErrorMessage(error, "Unable to log you in."));
    }
  }

  return (
    <form
      className={cn('flex flex-col gap-6', className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome Back!</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Please enter your credentials to sign in.
          </p>
        </div>

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
          />
        </Field>

        {/* submit button */}
        <Field>
          <Button type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Logging in...' : 'Login'}
          </Button>
          <FieldError>{formError}</FieldError>
        </Field>
        <Field>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="underline underline-offset-4">
              Sign up
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
