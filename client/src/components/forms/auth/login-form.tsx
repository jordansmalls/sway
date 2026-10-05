import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLoginMutation } from '@/api/auth';
import { getApiErrorMessage } from '@/api/client';
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

export function LoginForm({ className, ...props }: React.ComponentProps<'form'>) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const loginMutation = useLoginMutation();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loginMutation.isPending) return;
    setFormError('');

    try {
      const { user } = await loginMutation.mutateAsync({
        identifier: identifier.trim().toLowerCase(),
        password,
      });
      toast.success(user.username ? `Welcome back ${user.username}!` : 'Welcome back!', {
        description: "You're signed in and ready to manage your rooms.",
      });
      navigate(user.hasUsername ? '/dashboard' : '/username', { replace: true });
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to log you in.'));
    }
  }

  return (
    <form
      {...props}
      className={cn('flex flex-col gap-6', className)}
      onSubmit={handleSubmit}
      aria-busy={loginMutation.isPending}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl tracking-tighter font-bold text-white">
            Login to Your Account.
          </h1>
          <FieldDescription className="text-white/50! text-center text-xs">
            Enter your credentials to jump back into the action.
          </FieldDescription>
        </div>
        <Field>
          <FieldLabel htmlFor="identifier">Username or Email</FieldLabel>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            placeholder="Enter username or email..."
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={loginMutation.isPending}
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value);
              setFormError('');
            }}
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? 'login-error' : undefined}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter password..."
            autoComplete="current-password"
            required
            disabled={loginMutation.isPending}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFormError('');
            }}
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? 'login-error' : undefined}
          />
        </Field>
        <Field>
          <Button type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Logging in...' : 'Login'}
          </Button>
          <FieldError id="login-error">{formError}</FieldError>
        </Field>
      </FieldGroup>
      <FieldDescription className="px-6 text-center text-white/50">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="transition duration-150">
          Signup
        </Link>
      </FieldDescription>
    </form>
  );
}
