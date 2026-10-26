import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useResetPasswordMutation } from '@/api/auth';
import { getApiErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [invalidLink, setInvalidLink] = useState(!/^[a-f0-9]{64}$/.test(token));
  const [complete, setComplete] = useState(false);
  const mutation = useResetPasswordMutation();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending || invalidLink || complete) return;
    setFormError('');
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    try {
      await mutation.mutateAsync({ token, newPassword: password });
      setPassword('');
      setConfirmPassword('');
      setComplete(true);
      window.history.replaceState(window.history.state, '', window.location.pathname);
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to reset your password. Please try again.'));
      if (isAxiosError(error) && error.response?.status === 400) setInvalidLink(true);
    }
  }

  if (complete || invalidLink) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <div className="flex flex-col gap-2" role="status">
          <h1 className="text-3xl tracking-tighter font-bold text-white">
            {complete ? 'Password reset' : 'Request a new reset link'}
          </h1>
          <FieldDescription className="text-center text-white/50">
            {complete
              ? 'Your password has been updated and previous sessions have been signed out. Log in to get back to your rooms.'
              : formError ||
                'This reset link is missing or invalid. Request a new link to continue.'}
          </FieldDescription>
        </div>
        <Button asChild>
          <Link to={complete ? '/login' : '/forgot-password'}>
            {complete ? 'Log in' : 'Send a new reset link'}
          </Link>
        </Button>
        {!complete ? (
          <FieldDescription className="text-center text-white/50">
            <Link to="/login">Back to login</Link>
          </FieldDescription>
        ) : null}
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit} aria-busy={mutation.isPending}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl tracking-tighter font-bold text-white">Choose a new password</h1>
          <FieldDescription className="text-white/50! text-center text-xs">
            Use at least 8 characters. You&apos;ll log in again after the reset.
          </FieldDescription>
        </div>
        <Field>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <Input
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={mutation.isPending}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFormError('');
            }}
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? 'reset-password-error' : undefined}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-new-password">Confirm new password</FieldLabel>
          <Input
            id="confirm-new-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={mutation.isPending}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setFormError('');
            }}
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? 'reset-password-error' : undefined}
          />
        </Field>
        <Field>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Resetting password...' : 'Reset password'}
          </Button>
          <FieldError id="reset-password-error">{formError}</FieldError>
        </Field>
      </FieldGroup>
      <FieldDescription className="text-center text-white/50">
        <Link to="/login">Back to login</Link>
      </FieldDescription>
    </form>
  );
}
