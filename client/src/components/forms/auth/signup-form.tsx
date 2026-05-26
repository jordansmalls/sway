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

import { getApiErrorMessage } from '@/api/client';
import {
  useEmailAvailabilityQuery,
  useSignupMutation,
} from '@/api/auth';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();
  const signupMutation = useSignupMutation();
  const debouncedEmail = useDebouncedValue(email);
  const canCheckEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail);
  const emailAvailabilityQuery = useEmailAvailabilityQuery(
    canCheckEmail ? debouncedEmail : ''
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    if (emailAvailabilityQuery.data?.taken) {
      setFormError('Email is already in use.');
      return;
    }

    try {
      const { user } = await signupMutation.mutateAsync({ email, password });
      navigate(user.hasUsername ? '/' : '/username');
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to create your account.'));
    }
  }

  const emailMessage =
    canCheckEmail && emailAvailabilityQuery.isFetching
      ? 'Checking email...'
      : emailAvailabilityQuery.data?.message;
  
  return (
    <form className={cn('flex flex-col gap-6', className)} onSubmit={handleSubmit} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Join us and start taking live song requests, engaging your crowd, and keeping the dancefloor packed.
          </p>
        </div>
        <Field>
          {/* email */}
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" placeholder="john@doe.com" required value={email} onChange={(e) => setEmail(e.target.value.toLowerCase())} />
          {emailMessage ? (
            <FieldDescription
              className={cn(
                'text-xs',
                emailAvailabilityQuery.data?.taken && 'text-destructive'
              )}
            >
              {emailMessage}
            </FieldDescription>
          ) : null}
        </Field>

        {/* password */}
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" type="password" placeholder="********" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>

        {/* confirm password */}
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input id="confirm-password" type="password" placeholder="********" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </Field>

        {/* submit button */}
        <Field>
          <Button type="submit" disabled={signupMutation.isPending}>
            {signupMutation.isPending ? 'Creating account...' : 'Register'}
          </Button>
          <FieldError>{formError}</FieldError>
        </Field>
        
        <Field>
          <FieldDescription className="text-center">
            Already have an account?{' '}
            <Link to="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
