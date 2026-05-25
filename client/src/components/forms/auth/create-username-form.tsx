import { GalleryVerticalEnd } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';



export function CreateUsernameForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {

  const [username, setUsername] = useState("");

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <form>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Acme Inc.</span>
            </a>
            <h1 className="text-xl font-bold">
              You're in. Let's pick your handle.
            </h1>
            <FieldDescription className="text-center">
              Your username acts as your public profile link. Use it to share
              your live request queues with clients and guests.
            </FieldDescription>
          </div>
          <Field>
            <Input
              id="username"
              type="text"
              placeholder="jazzyjeff"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              minLength={3}
              maxLength={20}
              autoComplete="username"
            />
          </Field>
          <FieldDescription className="px-6 text-center text-xs">
            Usernames must be 3-20 characters long and can only contain letters,
            numbers, and underscores.
          </FieldDescription>
          <Field>
            <Button type="submit">Next</Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
