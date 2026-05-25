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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form className={cn('flex flex-col gap-6', className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Welcome Back!</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Please enter your credentials to sign in.
          </p>
        </div>

        {/* identifier */}
        <Field>
          <FieldLabel htmlFor="identifier">Username or Email</FieldLabel>
          <Input id="identifier" type="text" placeholder="jazzyjeff" required value={identifier} onChange={(e) => setIdentifier(e.target.value.toLowerCase())} />
        </Field>

        {/* password */}
        <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input id="password" type="password" placeholder="********" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>

        {/* submit button */}
        <Field>
          <Button type="submit">Login</Button>
        </Field>
        <Field>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{' '}
            <a href="/signup" className="underline underline-offset-4">
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
