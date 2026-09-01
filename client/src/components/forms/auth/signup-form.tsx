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
import { toast } from 'sonner';

import { useSearchParams } from 'react-router-dom';

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {

  const [searchParams] = useSearchParams();

  // const [email, setEmail] = useState('');


  const initialEmail = searchParams.get('email')?.toLowerCase() ?? '';
  const [email, setEmail] = useState(initialEmail);

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
      toast.success("Welcome!", { description: "We're excited to get you started." })
      navigate(user.hasUsername ? '/' : '/username');
    } catch (error) {
      toast.error("Oops! Something went wrong.", { description: "We were unable to create your account. Please try again." })
      setFormError(getApiErrorMessage(error, 'Unable to create your account.'));
    }
  }

  const emailMessage = !canCheckEmail
    ? null
    : emailAvailabilityQuery.isFetching
      ? 'Checking email...'
      : emailAvailabilityQuery.isError
        ? getApiErrorMessage(
            emailAvailabilityQuery.error,
            'Unable to check email availability.'
          )
        : emailAvailabilityQuery.data
          ? emailAvailabilityQuery.data.taken
            ? 'Email is already in use.'
            : 'Email is available!'
          : null;




  return (
    <form
      className={cn('flex flex-col gap-5', className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <Field>
          {/* email */}
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="john@doe.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            className="h-12 rounded-xl border-zinc-200 bg-zinc-50 px-4 text-zinc-950 shadow-none placeholder:text-zinc-400 focus-visible:border-zinc-400 focus-visible:ring-zinc-300/30 dark:border-input dark:bg-secondary dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:border-ring dark:focus-visible:ring-ring/50"
          />
          {emailMessage ? (
            <FieldDescription
              className={cn(
                'text-xs',
                (emailAvailabilityQuery.data?.taken ||
                  emailAvailabilityQuery.isError) &&
                  'text-destructive',
                emailAvailabilityQuery.isSuccess &&
                  !emailAvailabilityQuery.data.taken &&
                  'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {emailMessage}
            </FieldDescription>
          ) : null}
        </Field>

        {/* password */}
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            placeholder="Must be at least 8 characters"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border-zinc-200 bg-zinc-50 px-4 text-zinc-950 shadow-none placeholder:text-zinc-400 focus-visible:border-zinc-400 focus-visible:ring-zinc-300/30 dark:border-input dark:bg-secondary dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:border-ring dark:focus-visible:ring-ring/50"
          />
        </Field>

        {/* confirm password */}
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Confirm password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 rounded-xl border-zinc-200 bg-zinc-50 px-4 text-zinc-950 shadow-none placeholder:text-zinc-400 focus-visible:border-zinc-400 focus-visible:ring-zinc-300/30 dark:border-input dark:bg-secondary dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:border-ring dark:focus-visible:ring-ring/50"
          />
        </Field>

        {/* submit button */}
        <Field>
          <Button type="submit" disabled={signupMutation.isPending} className="h-12 rounded-xl bg-black text-base font-semibold text-white shadow-none hover:bg-zinc-800 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
            {signupMutation.isPending ? 'Creating account...' : 'Register'}
          </Button>
          <FieldError>{formError}</FieldError>
        </Field>

        <Field>
          <FieldDescription className="text-center text-sm text-zinc-500 dark:text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-zinc-950 underline underline-offset-4 dark:text-foreground">
              Log in
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
