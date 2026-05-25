import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  return (
    <form className={cn('flex flex-col gap-6', className)} {...props}>
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
          <Button type="submit">Register</Button>
        </Field>
        
        <Field>
          <FieldDescription className="text-center">
            Already have an account?{' '}
            <a href="/login" className="underline underline-offset-4">
              Log in
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
