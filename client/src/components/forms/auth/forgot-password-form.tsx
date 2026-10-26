import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPasswordMutation } from '@/api/auth';
import { getApiErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const mutation = useForgotPasswordMutation();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setFormError('');
    try {
      await mutation.mutateAsync({ email: email.trim().toLowerCase() });
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to request a reset link. Please try again.'));
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit} aria-busy={mutation.isPending}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl tracking-tighter font-bold text-white">
            {mutation.isSuccess ? 'Check your email' : 'Forgot your password?'}
          </h1>
          <FieldDescription
            className="text-white/50! text-center text-xs"
            role={mutation.isSuccess ? 'status' : undefined}
          >
            {mutation.isSuccess
              ? mutation.data.message
              : "Enter your account email and we'll send you a reset link."}
          </FieldDescription>
        </div>
        {mutation.isSuccess ? (
          <FieldDescription className="text-center text-white/50 text-xs">
            The link expires in 30 minutes. If it hasn&apos;t arrived, wait a minute and check that
            you entered the right address.
          </FieldDescription>
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor="reset-email">Email</FieldLabel>
              <Input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="your@email.com"
                required
                maxLength={254}
                disabled={mutation.isPending}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFormError('');
                }}
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? 'forgot-password-error' : undefined}
              />
            </Field>
            <Field>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Requesting link...' : 'Send reset link'}
              </Button>
              <FieldError id="forgot-password-error">{formError}</FieldError>
            </Field>
          </>
        )}
      </FieldGroup>
      {mutation.isSuccess ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            mutation.reset();
            setFormError('');
          }}
        >
          Try again or use another email
        </Button>
      ) : null}
      <FieldDescription className="text-center text-white/50">
        <Link to="/login">Back to login</Link>
      </FieldDescription>
    </form>
  );
}
