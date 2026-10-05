import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useEmailAvailabilityQuery, useSignupMutation } from '@/api/auth';
import { getApiErrorMessage } from '@/api/client';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
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

export function SignupForm({ className, ...props }: React.ComponentProps<'form'>) {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get('email')?.toLowerCase() ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const signupMutation = useSignupMutation();
  const navigate = useNavigate();
  const normalizedEmail = email.trim().toLowerCase();
  const debouncedEmail = useDebouncedValue(normalizedEmail);
  const canCheckEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail);
  const emailAvailabilityQuery = useEmailAvailabilityQuery(canCheckEmail ? debouncedEmail : '');
  const availabilityIsCurrent = canCheckEmail && normalizedEmail === debouncedEmail;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signupMutation.isPending) return;
    setFormError('');

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (availabilityIsCurrent && emailAvailabilityQuery.data?.taken) {
      setFormError('Email is already in use.');
      return;
    }

    try {
      const { user } = await signupMutation.mutateAsync({ email: normalizedEmail, password });
      toast.success('Welcome!', { description: "We're excited to get you started." });
      navigate(user.hasUsername ? '/dashboard' : '/username', { replace: true });
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to create your account.'));
    }
  }

  const emailMessage = !availabilityIsCurrent
    ? null
    : emailAvailabilityQuery.isFetching
      ? 'Checking email...'
      : emailAvailabilityQuery.isError
        ? getApiErrorMessage(emailAvailabilityQuery.error, 'Unable to check email availability.')
        : emailAvailabilityQuery.data
          ? emailAvailabilityQuery.data.taken ? 'Email is already in use.' : 'Email is available!'
          : null;

  return (
    <form
      {...props}
      className={cn('flex flex-col gap-6', className)}
      onSubmit={handleSubmit}
      aria-busy={signupMutation.isPending}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl tracking-tighter font-bold text-white">Create an Account.</h1>
          <FieldDescription className="text-white/50! text-center text-xs">
            All you need is an email and password to get started.
          </FieldDescription>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={signupMutation.isPending}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFormError('');
            }}
            aria-invalid={availabilityIsCurrent && Boolean(emailAvailabilityQuery.data?.taken)}
            aria-describedby={emailMessage ? 'email-availability' : undefined}
          />
          {emailMessage ? (
            <FieldDescription
              id="email-availability"
              aria-live="polite"
              className={cn(
                'text-xs',
                (emailAvailabilityQuery.data?.taken || emailAvailabilityQuery.isError) && 'text-destructive',
                emailAvailabilityQuery.isSuccess && !emailAvailabilityQuery.data.taken && 'text-emerald-400',
              )}
            >
              {emailMessage}
            </FieldDescription>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Must be at least 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={signupMutation.isPending}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFormError('');
            }}
            aria-describedby={formError ? 'signup-error' : undefined}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={signupMutation.isPending}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setFormError('');
            }}
            aria-describedby={formError ? 'signup-error' : undefined}
          />
        </Field>
        <Field>
          <Button type="submit" disabled={signupMutation.isPending}>
            {signupMutation.isPending ? 'Creating account...' : 'Signup'}
          </Button>
          <FieldError id="signup-error">{formError}</FieldError>
        </Field>
      </FieldGroup>
      <FieldDescription className="px-6 text-center text-white/50">
        Already have an account?{' '}
        <Link to="/login" className="transition duration-150">Login</Link>
      </FieldDescription>
    </form>
  );
}
